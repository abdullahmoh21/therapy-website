# Fatima's Therapy Services — Booking Platform

An application built for a practicing therapist to manage her practice — currently used by paying clients. One deployment is live at https://www.fatimanaqvi.com.

This system was built to replace an unreliable mix of manual scheduling, Google Calendar inconsistencies, and unmanaged Calendly bookings (whats Calendly? see [here](https://calendly.com/scheduling)). It centralizes the entire booking lifecycle, eliminates double-bookings, ensures identity-verified scheduling, and automates reminders, cancellations, and recurring sessions — reducing daily administrative work significantly.

This repository contains:

- A modular Node.js API with MongoDB persistence
- A React/Tailwind frontend
- Two isolated KeyDB (Redis-compatible) instances for cache + queue
- Background workers powered by BullMQ
- Email templating & notification pipelines
- Docker + Nginx production infrastructure

## Features — Core Platform

- Booking creation via three sources:
  - Admin-created one-off bookings
  - System-generated recurring bookings
  - User-created bookings via Calendly
- Conflict checks across all booking sources using Calendly API + Google Calendar
- Authentication and RBAC with JWT access + refresh tokens
- Admin dashboard for managing bookings, users, and pricing
- Google Calendar integration to sync all bookings to the therapist’s calendar

## Calendly Webhook Security (JTI-Based Validation)

Calendly doesn't provide identity guarantees, so the platform uses a two-layer validation flow.

### 1. Source verification

Every incoming webhook is validated using Calendly’s HMAC signature.

### 2. User identity verification (JTI token)

A one-time scheduling token (JTI) is issued to authenticated users and embedded into the Calendly link.

**Flow:**

- When a logged-in user initiates scheduling, the backend generates a signed JTI and stores it on their account.
- Calendly webhooks include this JTI.
- On webhook receipt:
  1. The HMAC signature is validated.
  2. The JTI is extracted and checked in MongoDB.
  3. If valid, the booking is attached to the correct user.
  4. If not, the booking is rejected and the submitter is emailed that registration is required.

This ensures all bookings are both authentic and user-verified.

## Caching & Configuration

### Config-backed response caching

- Central config file defines:
  - TTL
  - Per-user or global caching
  - Allowed query params
  - Invalidation events
- Routes matched via regex (e.g., /^\/api\/bookings$/)

### Layered configuration store

Redis → MongoDB → local fallback  
Ensures fast reads with operational safety even during partial outages.

### Event-driven cache invalidation

Domain events (`user-updated`, `booking-created`, etc.) map to cache key patterns for precise invalidation.

## Background Processing

- Durable jobs using the Outbox pattern
- BullMQ workers for email, reminders, and async tasks
- Graceful degradation when Redis is offline

## Notifications

- Handlebars templates
- Queue-based sending
- Confirmation, cancellation, and reminder flows

## Architecture Overview
```
                   ┌─────────────────────────────┐
                   │            Client           │
                   │        (React + Vite)       │
                   └───────────────┬─────────────┘
                                   │
                                   ▼
                   ┌─────────────────────────────┐
                   │          API Server         │
                   │      Node.js + Express      │
                   └───────────────┬─────────────┘
                                   │
        ┌──────────────────────────┼────────────────────────┐
        │                          │                        │
        ▼                          ▼                        ▼
┌────────────────┐      ┌────────────────┐          ┌────────────────┐
│    MongoDB     │      │ Redis (Cache)  │          │  Redis (Queue) │
│  Persistent DB │      │  Fast Reads    │          │   BullMQ Jobs  │
└────────────────┘      └────────────────┘          └───────┬────────┘
                                                            │
                                                            ▼
                                                ┌────────────────────────┐
                                                │   Background Workers   │
                                                │(Emails, Reminders, etc)│
                                                └────────────────────────┘

```
## Stack

*TL;DR — MERN + Redis + BullMQ*

##### Backend
- Node.js + Express (API)
- MongoDB + Mongoose (database)
- KeyDB/Redis (cache + queues)
- BullMQ (background jobs)
- Nodemailer + Handlebars (emails)
- Google Calendar API + Calendly webhooks (integrations)

##### Frontend
- React (app)
- Redux Toolkit + RTK Query (state & data fetching)
- TailwindCSS (styling)
- Vite (bundler/dev server)

##### DevOps / Infra
- Docker + Docker Compose (containerization)
- Nginx (reverse proxy)
- Let’s Encrypt (TLS)

## Getting Started
For the backend run:
```bash
cd backend  
npm install  
cp .env.example .env.development  
npm run dev
```
For the frontend run:
```bash
cd frontend  
npm install  
npm run dev
```
For Full stack (Docker):
```bash
docker-compose up --build
```
## Testing

560+ backend tests with ~80% coverage.
```bash
cd backend  
npm test
```
## Deployment Notes

- Nginx reverse proxy
- TLS via Let's Encrypt
- Isolated KeyDB instances for cache and queue

## License

See [LICENSE](/LICENSE).
