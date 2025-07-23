# JCS Photo Suite - Showcase Repository

> **Enterprise SaaS Plugin for PowerSchool**  
> *Full-stack photo management system with licensing, payments, and security*

## 📚 Table of Contents

- [🚀 Project Overview](#-project-overview)
- [🚧 Current Development Status](#-current-development-status)
- [🎥 Demo Video](#-demo-video)
- [📸 Screenshot Gallery](#-screenshot-gallery)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Technology Stack](#️-technology-stack)
- [🔐 Security Features](#️-security-features)
- [💰 Business Logic](#️-business-logic)
- [📁 Project Structure](#️-project-structure)
- [🔒 IP Protection Notice](#️-ip-protection-notice)
- [📊 Performance & Scalability](#️-performance--scalability)
- [📄 License](#️-license)




## 🚀 Project Overview

JCS Photo Suite is a production-ready SaaS plugin for PowerSchool that enables secure, mobile-friendly photo uploads with license-based distribution and automated billing for educational districts.

**Key Features:**
- 🔐 **Secure Licensing System** - License validation and usage tracking
- 💳 **Payment Integration** - Stripe subscriptions, tiered pricing ($0-$5k+), proration
- 📱 **Mobile-First UI** - Responsive design with webcam capture and drag-and-drop cropping
- 🛡️ **Enterprise Security** - JWT auth, rate limiting, input validation
- 📧 **Email Automation** - Dynamic HTML templates for onboarding, alerts, renewals
- 🚀 **CI/CD Pipeline** - Automated builds, watermarking, packaging, deployment

## 🚧 Current Development Status

> **⚠️ Technical Architecture Note**
> 
> **Temporarily Retracted Features:** Heartbeat monitoring and violation tracking have been temporarily disabled due to state management limitations in PowerSchool's traditional HTML/CSS/JavaScript architecture.
> 
> **Technical Challenge:** While these features were successfully implemented and functional, they occasionally triggered false license validation errors that disrupted the user experience.
> 
> **Future Implementation:** These capabilities will be re-implemented using PowerSchool's new Angular framework, which provides better state management and will eliminate the current technical constraints.
> 
> This decision prioritizes **user experience reliability** over feature completeness in the current release.

## 🎥 Demo Video

**📹 Video Demo of the plugin in action**

Uploading from your computer/ gallery and a Webcam

https://github.com/user-attachments/assets/38fe01c2-d59d-4a6b-9ea3-5d2e5f04174d

Uploading from a mobile device:

> (I did not let the screen refresh in this video as it resets the page zoomed in state and contains personal information, but rest assured it works just as it does in the desktop uploads)

https://github.com/user-attachments/assets/f39bde86-d6eb-4b6d-8de2-8b6d82be0e0e
### 📸 Screenshot Gallery

**🖼️ Screenshots**

User Dashboard:


<img width="2482" height="1344" alt="Screenshot 2025-07-23 025815" src="https://github.com/user-attachments/assets/c3ace045-8d59-431b-ad16-6f8997f7c7ba" />



Automated Email Notifications:
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

## 🔐 Security Features

- **License Validation** - Real-time license checking
- **Rate Limiting** - API protection against abuse
- **Input Validation** - Comprehensive sanitization and validation
- **Usage Tracking** - Detailed monitoring of plugin usage
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

## 📊 Performance & Scalability

- **CDN Integration** - Secure module delivery with caching
- **Database Optimization** - Indexed queries and connection pooling
- **Image Processing** - Efficient in-memory processing with Sharp
- **Load Testing** - Comprehensive performance monitoring
- **Caching Strategy** - Intelligent cache management and cleanup


## 📄 License

This project is proprietary software. All rights reserved.
