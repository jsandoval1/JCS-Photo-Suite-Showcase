import { CurrentPlanSection, PricingGrid, SubscriptionProcessSection } from '../components';
import PaymentMethodsSection from '../components/sections/PaymentMethodsSection';
import SubscriptionDetailsSection from '../components/sections/SubscriptionDetailsSection';
import '../App.css';
import './Pricing.css';

function Pricing() {
  return (
    <section className="pricing">
      <div className="container">
        <h2>Simple, Transparent Pricing</h2>
        <p className="pricing-subtitle">
          Annual subscriptions with flexible payment options. Request a quote to get started.
        </p>

        <PricingGrid />
        <SubscriptionProcessSection />
        <div className="pricing-bottom-sections">
          <PaymentMethodsSection />
          <SubscriptionDetailsSection />
        </div>

      </div>
    </section>
  );
}

export default Pricing; 