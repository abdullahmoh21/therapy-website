# Fatima's Therapy Services – Booking Platform

A full-stack, secure, and scalable booking system for therapy sessions, built with modern web tech. It supports client management, session scheduling, payments, and robust admin tools. [Live Site](https://www.fatimanaqvi.com)

---

## Tech Stack

**Backend**: Node.js, Express, MongoDB, Redis/KeyDB, BullMQ, JWT  
**Frontend**: React, Redux Toolkit, TailwindCSS, React Router  
**DevOps**: Docker, Nginx, Let's Encrypt, PM2

---

## Features

#### Authentication

- JWT-based login with refresh tokens
- Secure password flows (hashing, reset, email verification)
- Role-based access & invite-only registration

#### Booking System

- Calendly integration with webhooks
- Session customization, admin timelines
- Email notifications, cancellation windows

#### Payments

- Local gateway integration
- Refund handling, receipt generation
- Payment tracking & reporting

#### Admin Dashboard

- Filterable booking views
- User & payment management
- Configurable system settings
- Basic analytics

---

## Technical Highlights

- **Redis Caching**: Smart hierarchical keys, event-based invalidation, compression fallback
- **Rate Limiting & Security**: Exponential backoff, IP blocking, and webhook protection.
- **BullMQ Queue**: Durable background tasks with graceful fallbacks and retry logic
- **Live Configuration**: Admin-editable settings with multi-level caching and change logs
- **Monitoring & Logging**: Structured JSON logs, rotation, health checks, alerting
- **Fault Tolerance**: Graceful degradation, circuit breakers, self-recovery mechanisms

---

## Testing

Backend has Jest-based unit and integration tests. Run all tests with:

```bash
npm test
```

## Deployment

- **Docker Compose**: Multi-container setup with volume persistence and service isolation
- **Nginx:** SSL termination, reverse proxy
- **Let's Encrypt:** Auto-managed TLS certificates

## Dev Setup

```bash
# Clone repo & install dependencies
git clone https://github.com/abdullahmoh21/therapy-website.git
cd backend && npm install
cd ../frontend && npm install

# Create environment config
cp ./backend/.env.example ./backend/.env.development

# Run dev servers (in separate terminal windows)
cd backend && npm run dev    # Start backend dev server
cd frontend && npm run dev   # Start frontend dev server
```

App will be live at http://localhost:3000

## Prerequisites

- Node.js
- Docker + Docker Compose (for deployment)
- MongoDB & Redis (if not using Docker)
