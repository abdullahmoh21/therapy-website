/**
 * Cache Configuration
 *
 * This file defines the caching rules for different API endpoints.
 *
 * Structure:
 * - endpoints: Object mapping route patterns to caching configurations
 * - events: Object mapping event types to cache invalidation rules
 */

module.exports = {
  defaultTTL: 21600, // 6 hours

  // Endpoints configuration
  // Key is a regex pattern that matches the route path
  // Value is the configuration for matching routes
  endpoints: {
    // User profile endpoint
    "^/api/user$": {
      ttl: 3600, // 1 hour
      cachePerUser: true,
      allowQueryParams: [], // No query parameters allowed
      invalidateOn: ["user-updated", "user-profile-updated"],
    },

    // User bookings endpoints
    "^/api/bookings$": {
      ttl: 1800, // 30 minutes
      cachePerUser: true,
      allowQueryParams: ["page", "limit"], // Only cache with exactly these query params
      invalidateOn: ["booking-created", "booking-updated", "booking-deleted"],
    },

    // All user bookings endpoint
    "^/api/bookings/all$": {
      ttl: 1800, // 30 minutes
      cachePerUser: true,
      allowQueryParams: ["page", "limit"],
      invalidateOn: ["booking-created", "booking-updated", "booking-deleted"],
    },

    // Single booking endpoint
    "^/api/bookings/[a-f0-9]{24}$": {
      ttl: 1800, // 30 minutes
      cachePerUser: true,
      allowQueryParams: [],
      invalidateOn: ["booking-updated", "booking-deleted"],
    },

    // Payment endpoint - single payment
    "^/api/payments/[a-f0-9]{24}$": {
      ttl: 3600, // 1 hour
      cachePerUser: true,
      allowQueryParams: [],
      invalidateOn: ["payment-updated", "payment-deleted"],
    },

    // Admin routes

    // Admin users endpoint
    "^/api/admin/users$": {
      ttl: 300, // 5 minutes
      cachePerUser: false, // Global cache for all admins
      allowQueryParams: ["page", "limit"],
      invalidateOn: [
        "user-created",
        "user-updated",
        "user-deleted",
        "admin-data-changed",
      ],
    },

    // Admin single user endpoint
    "^/api/admin/users/[a-f0-9]{24}$": {
      ttl: 300, // 5 minutes
      cachePerUser: false,
      allowQueryParams: [],
      invalidateOn: ["user-updated", "user-deleted", "admin-data-changed"],
    },

    // Admin bookings endpoint
    "^/api/admin/bookings$": {
      ttl: 300, // 5 minutes
      cachePerUser: false,
      allowQueryParams: ["page", "limit", "showPastBookings"],
      invalidateOn: [
        "booking-created",
        "booking-updated",
        "booking-deleted",
        "admin-data-changed",
      ],
    },

    // Admin booking timeline
    "^/api/admin/bookings/timeline$": {
      ttl: 300, // 5 minutes
      cachePerUser: false,
      allowQueryParams: ["startDate", "endDate"],
      invalidateOn: [
        "booking-created",
        "booking-updated",
        "booking-deleted",
        "admin-data-changed",
      ],
    },

    // Admin single booking endpoint
    "^/api/admin/bookings/[a-f0-9]{24}$": {
      ttl: 300, // 5 minutes
      cachePerUser: false,
      allowQueryParams: [],
      invalidateOn: [
        "booking-updated",
        "booking-deleted",
        "admin-data-changed",
      ],
    },

    // Admin payments endpoint
    "^/api/admin/payments$": {
      ttl: 300, // 5 minutes
      cachePerUser: false,
      allowQueryParams: ["page", "limit", "status"],
      invalidateOn: [
        "payment-created",
        "payment-updated",
        "payment-deleted",
        "admin-data-changed",
      ],
    },

    // Admin invitations endpoint
    "^/api/admin/invitations$": {
      ttl: 300, // 5 minutes
      cachePerUser: false,
      allowQueryParams: ["page", "limit"],
      invalidateOn: [
        "invitation-created",
        "invitation-deleted",
        "admin-data-changed",
        "user-created",
      ],
    },
  },

  events: {
    "user-login": [
      {
        pattern: "admin:users",
        pathVariables: {
          urlPattern: "/api/admin/users/{{userId}}",
          variable: "userId",
        },
      },
    ],
    "user-created": [
      { pattern: "admin:users:*" },
      { pattern: "admin:invitations:*" },
    ],
    "user-updated": [
      { pattern: "user:*", userId: true },
      { pattern: "admin:users:*" },
    ],
    "user-deleted": [
      { pattern: "user:*", userId: true },
      { pattern: "admin:users:*" },
    ],
    "user-profile-updated": [
      { pattern: "user:*", userId: true },
      { pattern: "admin:users:*" },
    ],
    "booking-created": [
      { pattern: "bookings:*", userId: true },
      { pattern: "admin:bookings:*" },
    ],
    "booking-updated": [
      { pattern: "bookings:*", userId: true },
      { pattern: "admin:bookings:*" },
    ],
    "booking-deleted": [
      { pattern: "bookings:*", userId: true },
      { pattern: "admin:bookings:*" },
    ],
    "payment-updated": [
      { pattern: "payments:*", userId: true },
      { pattern: "bookings:*", userId: true },
      { pattern: "admin:payments:*" },
    ],
    "invitation-created": [{ pattern: "admin:invitations:*" }],
    "invitation-deleted": [{ pattern: "admin:invitations:*" }],
    "admin-data-changed": [{ pattern: "admin:*" }],
  },
};
