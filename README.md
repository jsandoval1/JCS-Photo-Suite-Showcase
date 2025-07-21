# JCS Photo Suite - Showcase Repository

> **Enterprise SaaS Plugin for PowerSchool**  
> *Full-stack photo management system with licensing, payments, and security*

## 🎥 Demo Video

> **📹 Video Demo Coming Soon**  
> *I plan to add a demo video by:*
> 1. *Recording a 2-3 minute demo showing:*
>    - *Plugin installation and setup*
>    - *Photo upload and cropping interface*
>    - *License management dashboard*
>    - *Payment processing flow*
> 2. *Dragging the video file directly into this README while editing*
> 3. *Letting GitHub automatically host and embed the video*

### 📸 Screenshot Gallery

> **🖼️ Screenshots Coming Soon**  
> *Key screens I plan to capture:*
> - *Dashboard with license status*
> - *Photo upload interface with cropping tools*
> - *Payment processing and subscription management*
> - *Mobile-responsive design on different devices*

## 🚀 Project Overview

JCS Photo Suite is a production-ready SaaS plugin for PowerSchool that enables secure, mobile-friendly photo uploads with license-based distribution and automated billing for educational districts.

**Key Features:**
- 🔐 **Secure Licensing System** - License validation, usage tracking, and anti-tampering
- 💳 **Payment Integration** - Stripe subscriptions, tiered pricing ($0-$5k+), proration
- 📱 **Mobile-First UI** - Responsive design with webcam capture and drag-and-drop cropping
- 🛡️ **Enterprise Security** - JWT auth, rate limiting, input validation, security monitoring
- 📧 **Email Automation** - Dynamic HTML templates for onboarding, alerts, renewals
- 🚀 **CI/CD Pipeline** - Automated builds, watermarking, packaging, deployment

## 🏗️ Architecture

```
JCS-Photo-Suite-Showcase/
├── frontend/                 # React SPA with Vite
│   ├── src/
│   │   ├── components/       # UI components and forms
│   │   ├── contexts/         # Auth and theme contexts
│   │   ├── services/         # API services and auth
│   │   ├── views/           # Page components
│   │   └── utils/           # Utilities and helpers
├── licensing-server/         # Express.js API backend
│   ├── controllers/         # API endpoints and business logic
│   ├── routes/             # Route definitions
│   ├── services/           # Business services
│   ├── utils/              # Utilities and email templates
│   └── cdn/               # Client-side modules (protected)
├── jcs-photo-suite-plugin/ # PowerSchool plugin modules
└── tools/                  # Build scripts and utilities
```

## 🛠️ Technology Stack

### Frontend
- **React 18** with Vite for fast development
- **Context API** for state management
- **Axios** for API communication
- **Stripe Elements** for payment processing
- **Responsive CSS** with modern design patterns

### Backend
- **Express.js** with middleware architecture
- **PostgreSQL** (Supabase) for data persistence
- **JWT** for authentication and authorization
- **Sharp** for image processing (server-side)
- **Resend** for email automation
- **Stripe** for payment processing

### DevOps
- **GitHub Actions** for CI/CD automation
- **Vercel** for frontend deployment
- **CDN** for secure module delivery
- **Security monitoring** and violation tracking

## 🔐 Security Features

- **License Validation** - Real-time license checking with heartbeat monitoring
- **Anti-Tampering** - Code integrity validation and security violation reporting
- **Rate Limiting** - API protection against abuse
- **Input Validation** - Comprehensive sanitization and validation
- **Usage Tracking** - Detailed monitoring of plugin usage and violations
- **Privacy Protection** - Images processed in-memory only, never stored

## 💰 Business Logic

### Pricing Tiers
- **Free Trial** - Basic features with usage limits
- **Basic Plan** - $500/year per district
- **Professional Plan** - $1,500/year per district  
- **Enterprise Plan** - $5,000/year per district with unlimited usage

### Revenue Features
- **Subscription Management** - Automated billing and renewal
- **Proration** - Fair billing for plan changes
- **Usage Tracking** - Detailed analytics and reporting
- **Email Automation** - Onboarding, alerts, and renewal notifications

## 📁 Project Structure

### Frontend (`/frontend`)
- **React SPA** with modern component architecture
- **Form Components** - Login, registration, contact, payment forms
- **Layout Components** - Navbar, footer, protected routes
- **Section Components** - Dashboard, pricing, features, checkout
- **UI Components** - Buttons, modals, status cards, loaders

### Backend (`/licensing-server`)
- **API Controllers** - Authentication, licensing, payments, CDN
- **Business Services** - Email automation, pricing, license management
- **Security Middleware** - JWT validation, rate limiting, input sanitization
- **Email Templates** - Dynamic HTML templates for all user communications

### Plugin (`/jcs-photo-suite-plugin`)
- **PowerSchool Integration** - Custom HTML pages and JavaScript modules
- **Staff Interface** - Faculty photo management
- **Student Interface** - Student photo uploads
- **Customization** - Navigation and branding customization

## 🔒 IP Protection Notice

This showcase repository contains placeholder implementations for sensitive image processing algorithms and security features. The actual production code includes:

- **Advanced Image Processing** - Server-side Sharp transformations with rotation, cropping, resizing
- **Real-time Cropping UI** - Drag-and-drop interface with zoom and rotation controls
- **Webcam Integration** - Mobile-friendly camera capture
- **Security Algorithms** - Anti-tampering, usage validation, and violation detection

## 📊 Performance & Scalability

- **CDN Integration** - Secure module delivery with caching
- **Database Optimization** - Indexed queries and connection pooling
- **Image Processing** - Efficient in-memory processing with Sharp
- **Load Testing** - Comprehensive performance monitoring
- **Caching Strategy** - Intelligent cache management and cleanup


## 📄 License

This project is proprietary software. All rights reserved.