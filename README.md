# Fatima's Therapy Services - Full-Stack Booking Management System

A robust, secure, and scalable booking management system built with modern web technologies. This project implements a comprehensive solution for managing client sessions, bookings, payments, and user accounts with high availability and fault tolerance. You can view the website [here](https://www.fatimanaqvi.com)

## Technology Stack

### Backend

- **Node.js & Express**: RESTful API backend with modular architecture
- **MongoDB**: Primary database with Mongoose ODM
- **Redis/KeyDB**: High-performance caching, rate limiting, and job queue
- **BullMQ**: Durable job scheduling for asynchronous tasks
- **JWT**: Secure authentication with refresh/access token pattern
- **Calendly Integration**: Webhook-based calendar synchronization

### Frontend

- **React**: Modern component-based UI
- **Redux Toolkit**: State management with RTK Query
- **TailwindCSS**: Utility-first CSS framework
- **React Router**: Client-side routing

### DevOps

- **Docker & Docker Compose**: Containerized deployment
- **Nginx**: Reverse proxy with SSL termination
- **Let's Encrypt**: Automated SSL certificate management
- **PM2**: Process management for Node.js applications

## Core Features

### Advanced Authentication System

- JWT-based authentication with refresh/access token pattern
- Secure password hashing with bcrypt
- Email verification and password reset flows
- Role-based access control (client/admin)
- Invitation-based registration for controlled user access

### Sophisticated Booking Management

- Calendar integration with Calendly
- Real-time availability checking
- Booking timeline visualization for admins
- Customizable session types and durations
- Automated email notifications for booking events
- Cancellation policies with configurable notice periods

### Secure Payment Processing

- Integration with local payment gateways
- Transaction history and receipt generation
- Refund processing for canceled sessions
- Payment status tracking and reconciliation

### Admin Dashboard

- Comprehensive booking overview with filtering options
- User management interface
- Payment tracking and reporting
- System configuration through admin UI
- Analytics and business metrics

## Technical Achievements

### High-Performance Redis Caching System

- **Sophisticated Cache Key Design**: Implemented a hierarchical caching system with distinct formats for different user types:
  - User-specific cache keys: `cache:{userId}:{resourceType}:{pathHash}`
  - Admin-global cache keys: `cache:admin:{resourceType}:{pathHash}`
- **Smart Cache Invalidation**: Event-based cache invalidation system that precisely targets affected resources
- **Compression**: zlib-based payload compression for reduced memory footprint
- **Graceful Degradation**: System remains functional with degraded performance when Redis is unavailable

### Intelligent Rate Limiting & Security

- **Adaptive Rate Limiting**: Implements exponential backoff strategy for repeated requests
- **IP-Based Blocking**: Temporary IP blocking stored in Redis for distributed protection
- **Webhook Protection**: Special bypass mechanisms for authenticated webhook endpoints
- **Bot Detection**: Identifies and throttles suspicious request patterns
- **Security Headers**: Comprehensive set of HTTP security headers via Helmet
- **CORS Protection**: Configurable cross-origin resource sharing

### Resilient Asynchronous Processing

- **Durable Job Queue**: BullMQ-based queue for email sending and background tasks
- **Automatic Fallback**: Direct processing when Redis/BullMQ is unavailable via `safeAdd` wrapper
- **Retry Mechanisms**: Exponential backoff for failed jobs with configurable limits

### Dynamic Configuration Management

- **Live Configuration Updates**: Admin-configurable system parameters without restart
- **Multi-Level Caching**: Redis-backed with local filesystem fallback for critical values
- **Default Fallbacks**: Sensible defaults when configuration store is unavailable
- **Configuration Propagation**: Real-time updates reflected in frontend components
- **Change Auditing**: Logs of configuration changes for security and troubleshooting

### Production-Ready Logging & Monitoring

- **Environment-Aware Logging**: Automatic log level adjustment based on environment
  - Development: Verbose debug logs included
  - Production: Optimized for important information only
- **Structured Logging**: JSON-formatted logs for easy parsing and analysis
- **Log Rotation**: Automatic management of log files to prevent disk space issues
- **Error Tracking**: Detailed error reporting with stack traces and request context
- **Performance Metrics**: Response times, cache hit ratios, and system load monitoring

### Fault Tolerance & High Availability

- **Graceful Degradation**: System remains functional with reduced capabilities when dependencies fail
- **Health Checks**: Continuous monitoring of system dependencies
- **Circuit Breaking**: Prevents cascading failures when services are overloaded
- **Automatic Recovery**: Self-healing mechanisms for common failure scenarios
- **Admin Alerts**: Real-time notifications for critical system events

### Containerized Deployment

- **Docker Compose**: Multi-container application deployment
- **Volume Management**: Persistent storage for database and configuration
- **Network Isolation**: Internal service networking with controlled external access
- **Health Checking**: Container-level health monitoring and automatic restarts
- **SSL Termination**: Integrated Let's Encrypt certificate management

## Performance Optimizations

- **Database Query Optimization**: Indexes and lean queries for optimal MongoDB performance
- **Conditional Rate Limiting**: Smart rate limiting that adapts to user behavior and system load
- **Response Compression**: Automatic gzip compression for API responses
- **Dependency Guards**: Middleware to prevent degraded user experience during partial outages
- **Resource Pooling**: Connection pooling for database and external services

## Security Measures

- **Input Validation**: Comprehensive request validation with express-validator
- **CSRF Protection**: Cross-Site Request Forgery prevention
- **XSS Protection**: Content Security Policy and output sanitization
- **Rate Limiting**: Protection against brute force and DDoS attacks
- **Secure Headers**: HTTP security headers for browser-based protection
- **Data Encryption**: Sensitive data encrypted at rest and in transit

## Development Features

- **Error Handling**: Centralized error handling with custom error classes
- **API Documentation**: Comprehensive API documentation with examples
- **Automated Testing**: Unit and integration tests for critical components
- **Code Organization**: Modular architecture with clear separation of concerns
- **Environment Configuration**: .env-based configuration for different environments

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (for development)
- MongoDB (for local development without Docker)
- Redis (for local development without Docker)

### Installation

1. Clone the repository
2. Create `.env` file in the `./backend` directory based on `.env.example`
3. Run `docker-compose up -d` to start all services
4. Access the application at `https://yourdomain.com`

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install` in both frontend and backend directories
3. Create `.env.development` file based on `.env.example`
4. Start backend: `npm run dev` in the backend directory
5. Start frontend: `npm start` in the frontend directory
6. Access the application at `http://localhost:3000`

## License

This project is licensed under the MIT License - see the LICENSE file for details.
