const pool = require('../config/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require('../utils/email');

/**
 * Stripe Webhook Controller
 * Handles subscription events from Stripe
 */

/**
 * Handle Stripe webhook events
 */
exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('❌ Webhook secret not configured');
        return res.status(500).send('Webhook secret not configured');
    }

    let event;
    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`🔔 Received webhook: ${event.type}`);

    try {
        // Handle the event
        switch (event.type) {
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;

            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;

            default:
                console.log(`🤷 Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error(`❌ Error handling webhook ${event.type}:`, error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
};

/**
 * Handle successful subscription payment
 */
async function handlePaymentSucceeded(invoice) {
    console.log('💰 Payment succeeded for invoice:', invoice.id);

    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    try {
        // Find license by subscription ID
        const { rows: licenseRows } = await pool.query(`
            SELECT l.*, u.email, u.first_name, u.last_name
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE l.stripe_subscription_id = $1
        `, [subscriptionId]);

        if (licenseRows.length === 0) {
            console.warn(`⚠️ No license found for subscription: ${subscriptionId}`);
            return;
        }

        const license = licenseRows[0];
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Development mode: Use shorter renewal periods for testing
            const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEVELOPMENT_MODE === 'true';
            const newExpiry = new Date();
            
            if (isDevelopment) {
                // In development: extend by 1 day for testing
                newExpiry.setDate(newExpiry.getDate() + 1);
                console.log(`🔧 DEV MODE: Extending license by 1 day for testing`);
            } else {
                // In production: extend by 1 year
                newExpiry.setFullYear(newExpiry.getFullYear() + 1);
            }

            await client.query(`
                UPDATE licenses 
                SET expiry_date = $1, 
                    is_active = true, 
                    payment_status = 'active',
                    grace_period_end = NULL,
                    payment_retry_count = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE license_key = $2
            `, [newExpiry.toISOString(), license.license_key]);

            // Log renewal in subscription history
            await client.query(`
                INSERT INTO subscription_history (
                    license_key, user_id, old_plan_tier, new_plan_tier,
                    change_type, amount, notes, stripe_payment_intent_id, payment_method
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                license.license_key,
                license.created_by_user_id,
                license.plan_tier,
                license.plan_tier,
                'renewal',
                invoice.amount_paid / 100, // Convert from cents
                `Subscription renewed via webhook - Invoice: ${invoice.id}${isDevelopment ? ' (DEV MODE - 1 day)' : ''}`,
                invoice.payment_intent,
                'stripe'
            ]);

            await client.query('COMMIT');

            // Calculate pricing breakdown for email
            const totalCharged = invoice.amount_paid / 100; // Convert from cents to dollars
            const pricingService = require('../services/pricing.service');
            
            // Calculate license cost (reverse engineer from total)
            const licenseCost = Math.round((totalCharged - 0.30) / 1.029 * 100) / 100; // Remove fixed fee then percentage
            const processingFee = (totalCharged - licenseCost).toFixed(2);
            
            // Send renewal confirmation email using modular service
            await emailService.sendRenewalSuccessEmail(license, newExpiry, totalCharged, licenseCost, processingFee);

            console.log(`✅ License ${license.license_key} renewed successfully${isDevelopment ? ' (DEV MODE)' : ''}`);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error handling payment succeeded:', error);
    }
}

/**
 * Handle failed subscription payment
 */
async function handlePaymentFailed(invoice) {
    console.log('💳 Payment failed for invoice:', invoice.id);

    const subscriptionId = invoice.subscription;
    const retryCount = invoice.attempt_count || 1;

    try {
        // Find license by subscription ID
        const { rows: licenseRows } = await pool.query(`
            SELECT l.*, u.email, u.first_name, u.last_name
            FROM licenses l
            JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'
            JOIN users u ON ul.user_id = u.id
            WHERE l.stripe_subscription_id = $1
        `, [subscriptionId]);

        if (licenseRows.length === 0) {
            console.warn(`⚠️ No license found for subscription: ${subscriptionId}`);
            return;
        }

        const license = licenseRows[0];

        // Calculate next retry time (1 day, 3 days, 7 days)
        const nextRetryDays = retryCount === 1 ? 1 : retryCount === 2 ? 3 : 7;
        const nextRetryAt = new Date();
        nextRetryAt.setDate(nextRetryAt.getDate() + nextRetryDays);

        // Record payment failure
        await pool.query(`
            INSERT INTO payment_failures (
                license_key, failure_code, failure_message, retry_count, next_retry_at
            )
            VALUES ($1, $2, $3, $4, $5)
        `, [
            license.license_key,
            invoice.last_finalization_error?.code || 'payment_failed',
            invoice.last_finalization_error?.message || 'Payment failed',
            retryCount,
            nextRetryAt
        ]);

        // Update license retry count
        await pool.query(`
            UPDATE licenses 
            SET payment_retry_count = $1, last_payment_attempt = CURRENT_TIMESTAMP
            WHERE license_key = $2
        `, [retryCount, license.license_key]);

        // Send payment failure email using modular service
        await emailService.sendPaymentFailedEmail(license, retryCount, nextRetryAt);

        // If this is the final attempt, start deactivation process
        if (retryCount >= 3) {
            const gracePeriodEnd = new Date();
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

            await pool.query(`
                UPDATE licenses 
                SET grace_period_end = $1
                WHERE license_key = $2
            `, [gracePeriodEnd, license.license_key]);

            console.log(`⏰ Final payment attempt failed for ${license.license_key}, grace period started`);
        }

    } catch (error) {
        console.error('❌ Error handling payment failed:', error);
    }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription) {
    console.log('🆕 Subscription created:', subscription.id);

    const customerId = subscription.customer;
    const licenseKey = subscription.metadata.license_key;

    if (licenseKey) {
        await pool.query(`
            UPDATE licenses 
            SET stripe_subscription_id = $1, auto_renew = true
            WHERE license_key = $2
        `, [subscription.id, licenseKey]);

        console.log(`✅ Linked subscription ${subscription.id} to license ${licenseKey}`);
    }
}

/**
 * Handle subscription deleted (cancelled)
 */
async function handleSubscriptionDeleted(subscription) {
    console.log('🗑️ Subscription deleted:', subscription.id);

    const { rows: licenseRows } = await pool.query(`
        SELECT l.*, u.email, u.first_name
        FROM licenses l
        JOIN user_licenses ul ON l.license_key = ul.license_key AND ul.role = 'primary'  
        JOIN users u ON ul.user_id = u.id
        WHERE l.stripe_subscription_id = $1
    `, [subscription.id]);

    if (licenseRows.length > 0) {
        const license = licenseRows[0];

        await pool.query(`
            UPDATE licenses 
            SET auto_renew = false, stripe_subscription_id = NULL
            WHERE license_key = $1
        `, [license.license_key]);

        // Log cancellation
        await pool.query(`
            INSERT INTO subscription_history (
                license_key, user_id, old_plan_tier, new_plan_tier,
                change_type, amount, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            license.license_key,
            license.created_by_user_id,
            license.plan_tier,
            license.plan_tier,
            'subscription_cancelled',
            0,
            `Stripe subscription cancelled: ${subscription.id}`
        ]);

        console.log(`✅ Subscription cancelled for license ${license.license_key}`);
    }
}

/**
 * Handle payment intent failed (one-time payments)
 */
async function handlePaymentIntentFailed(paymentIntent) {
    console.log('💳 Payment intent failed:', paymentIntent.id);

    const licenseKey = paymentIntent.metadata.license_key;
    
    if (licenseKey) {
        await pool.query(`
            INSERT INTO payment_failures (
                license_key, stripe_payment_intent_id, failure_code, failure_message, retry_count
            )
            VALUES ($1, $2, $3, $4, $5)
        `, [
            licenseKey,
            paymentIntent.id,
            paymentIntent.last_payment_error?.code || 'payment_failed',
            paymentIntent.last_payment_error?.message || 'Payment failed',
            1
        ]);
    }
}

// Old inline email functions removed - now using modular email service from utils/email.js 