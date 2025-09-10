---
title: "API Overview"
sidebar_label: "Overview"
sidebar_position: 1
---

# Partner API Overview

This section provides comprehensive documentation for integrating your backend systems with Rapido's Partner APIs. These APIs enable server-to-server communication for token validation, user data retrieval, and session management.

## API Architecture

Rapido's Partner API follows REST principles with JSON-based request/response format. All endpoints require HTTPS and use bearer token authentication for security.

### Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `<rapido-host-url-prod>/` |
| Staging | `<rapido-host-url-staging>/` |
| Sandbox | `<rapido-host-url-sandbox>/` |

### Authentication

All API requests must include your Partner API key in the Authorization header:

```http
authorization: CLIENT_KEY
```

Your Partner API key is provided during the partner onboarding process. Store it securely and never expose it in client-side code.

## Available APIs

### 1. Token Validation API
**Purpose**: Validate user authentication tokens received from your PWA

**Endpoint**: `POST /fetch-user-details`

**Use Case**: After your PWA receives a token via `onTokenReceived`, your backend calls this endpoint to validate the token and retrieve user information.

### 2. Events API
**Purpose**: Send business events (orders, bookings, payments) from your backend to Rapido's analytics system

**Endpoint**: `POST /event`

**Use Case**: Track order confirmations, cancellations, and other business events for analytics and business intelligence.

## API Features

### Security Features
- **TLS 1.3 Encryption**: All communications encrypted in transit
- **Token Expiration**: Short-lived tokens minimize security exposure
- **Rate Limiting**: Protects against abuse and ensures system stability
- **IP Whitelisting**: Additional security layer for production environments
- **Request Signing**: Optional HMAC signing for enhanced security

## Rate Limits

To ensure fair usage and system stability, the following rate limits apply:

| Endpoint | Rate Limit | Burst Limit |
|----------|------------|-------------|
| `/fetch-user-details` | 100 req/min | 200 req/min |
| `/event` | 500 req/min | 1000 req/min |

Rate limits are applied per Partner API key. Contact support for increased limits based on your usage requirements.

## Error Handling

All API responses follow a consistent error format:

```json
{
    "success": false,
    "code": "ERROR_CODE",
    "error": {
        "message": "Human-readable error description",
        "details": {
            "field": "Additional context if applicable"
        }
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_TOKEN` | 401 | Token is expired, malformed, or invalid |
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INVALID_REQUEST` | 400 | Malformed request or missing parameters |
| `INVALID_EVENT_DATA` | 400 | Event data format is invalid or missing required fields |
| `USER_NOT_FOUND` | 404 | User associated with token not found |
| `DUPLICATE_EVENT` | 409 | Event with same ID already exists |
| `SERVICE_UNAVAILABLE` | 503 | Temporary service disruption |

## Request/Response Format

### Request Headers
```http
Content-Type: application/json
authorization: CLIENT_KEY
x-client-id: CLIENT_ID
x-client-service: <your_service_offering>
x-client-appid: <your_app_id>
User-Agent: YourApp/1.0.0
```

### Success Response Format
```json
{
    "success": true,
    "data": {
        // Response-specific data
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789"
}
```

## Getting Started

### 1. Obtain API Credentials
Contact Rapido's partner team to:
- Get your Partner API key
- Set up IP whitelisting (recommended for production)
- Configure webhook endpoints (optional)

### 2. Test in Sandbox
Use the sandbox environment to:
- Validate your integration
- Test error scenarios
- Performance test your implementation

### 3. Implement Production Integration
Follow these best practices:
- Store API keys securely (environment variables, secrets manager)
- Implement proper error handling and retries
- Add comprehensive logging for debugging
- Monitor API usage and performance

### Health Checks
Monitor API availability:
```http
GET /health
```

Response:
```json
{
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.2.3"
}
```

## Support and Resources

### Documentation
- [Token Validation API](./token-validation.md) - Detailed endpoint documentation
- [API Examples](./examples.md) - Complete code samples for multiple languages

### Developer Support
- **Email**: [partner-api-support@rapido.bike](mailto:partner-api-support@rapido.bike)
- **Slack**: #partner-api-support (invite-only channel)
- **Documentation**: [Partner Portal](https://partners.rapido.bike/docs)

### SLA and Support Levels

| Support Level | Response Time | Availability |
|---------------|---------------|--------------|
| Production Issues | 2 hours | 24/7 |
| Integration Support | 1 business day | Business hours |
| Feature Requests | 3 business days | Business hours |

---

**Next Steps**: 
- Review [Token Validation API](./token-validation.md) for implementation details
- Review [Events Tracking](../integration/events-tracking.md) for complete events implementation guide
- See [Integration Examples](./examples.md) for complete code samples
- Check [Security Guidelines](../security.md) for production deployment guidelines