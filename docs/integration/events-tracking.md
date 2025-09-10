---
title: "Events Tracking"
sidebar_label: "Events Tracking"
sidebar_position: 3
---

# Events Tracking Integration

Rapido provides two complementary event tracking mechanisms to give you complete visibility into user interactions and business events across your PWA integration.

## Overview

| **Event Flow** | **Use Case** | **Triggered By** | **Data Flow** |
|----------------|--------------|------------------|---------------|
| **PWA to Native** | Real-time user interactions, analytics | User actions in PWA | PWA → Rapido App → Analytics |
| **Server to Server** | Business events, order lifecycle | Backend business logic | Partner Server → Rapido Server |

Both flows work together to provide comprehensive event tracking for your integration.

---

## PWA to Native Events

### Purpose
Track real-time user interactions, page views, and custom analytics events directly from your PWA to the Rapido mobile app.

### When to Use
- User interaction tracking (clicks, form submissions)
- Page view analytics
- Feature usage metrics
- Real-time user behavior analysis
- Custom analytics events

### Implementation

#### Method: `logEvents(eventType, propertiesJson)`

**Parameters:**
- `eventType` (string, required): Event type identifier (e.g., 'user_action', 'page_view', 'custom_event')
- `propertiesJson` (string, optional): JSON string containing event properties

**Important:** Properties must be **flat JSON only** - nested objects are **not allowed**. All property values must be primitives (string, number, boolean).

For complete implementation examples, see: **[PWA Events Examples](../api/examples.md#pwa-events-examples)**

#### Common Event Types

| **Event Type** | **Purpose** | **Example Properties** |
|----------------|-------------|------------------------|
| `user_action` | Track user interactions | `action_name`, `page_url`, `timestamp` |
| `page_view` | Track page navigation | `page_name`, `referrer`, `viewport_width` |
| `business_event` | Track conversion events | `event_type`, `service_type`, `estimated_price` |
| `custom_event` | Track app-specific events | Custom properties as needed |

**Remember:** All properties must be flat JSON - nested objects are **not allowed**.

#### Error Handling

Always implement error handling when logging PWA events:

- **Bridge Availability**: Check if `window.NativeJSBridge` exists
- **Method Availability**: Verify `logEvents` method is available  
- **Parameter Validation**: Ensure eventType is a non-empty string
- **JSON Validation**: Handle JSON.stringify() errors gracefully
- **Fallback Strategy**: Store events for later retry if bridge fails

For complete error handling implementation, see: **[PWA Events Examples](../api/examples.md#pwa-events-examples)**

#### Best Practices

- **Event Naming**: Use consistent naming conventions (e.g., snake_case)
- **Property Structure**: Properties must be flat JSON - nested objects are **not allowed**
- **Data Types**: Use only primitive values (string, number, boolean)
- **Data Size**: Keep property objects small to avoid large JSON strings
- **Error Handling**: Always wrap in try-catch and provide fallbacks
- **Timestamp**: Include timestamps for accurate event sequencing
- **User Context**: Add session and user context when available

---

## Server to Server Events

### Purpose
Track business-critical events, order lifecycle, and backend business logic events from your server to Rapido's analytics and business intelligence systems.

### When to Use
- Order confirmations and status updates
- Payment processing events
- Booking lifecycle tracking
- Business KPI events
- Integration health monitoring

### API Endpoint

**Method**: `POST`  
**URL**: `https://<rapido-host-url>/api/ota/event`

### Authentication & Headers

```http
POST /api/ota/event HTTP/1.1
Host: <rapido-host-url>
Content-Type: application/json
x-client-id: your-client-id
x-client-service: flights/hotels
x-client-app-id: your-app-id
authorization: your-client-key
```

### Request Schema

#### Base Event Structure Schema

```json
{
  "userId": "string", // (required) User ID received from Rapido token validation
  "event": {
    "type": "string", // (required) Event type identifier
    "id": "string" // (required) Unique event ID for deduplication
  },
  "attributes": {
    // (required) Service-specific event attributes - see schemas below
  },
  "schemaVersion": "number" // (required) Schema version, always 1
}
```

#### Booking Events Schema

```json
{
  "userId": "string", // (required) User ID from Rapido token validation response
  "event": {
    "type": "string", // (required) Event type: "order.confirmed", "order.cancelled", etc.
    "id": "string" // (required) Unique event identifier
  },
  "attributes": {
    "orderId": "string", // (required) Unique booking/order ID
    "orderStatus": "string", // (required) Order status from client system
    "amount_total": "number", // (required) Total booking amount
    "location_origin_lat": "float", // (required) Origin latitude coordinate
    "location_origin_long": "float", // (required) Origin longitude coordinate
    "location_dest_lat": "float", // (required) Destination latitude coordinate
    "location_dest_long": "float", // (required) Destination longitude coordinate
    "start_time": "number", // (required) Start timestamp (Unix epoch)
    "end_time": "number", // (required) End timestamp (Unix epoch)
    "hostStatus": "string", // (required) "CONFIRMED" or "CANCELLED" - used by Rapido
    "tz": "string" // (optional) Timezone identifier, defaults to "Asia/Kolkata"
  },
  "schemaVersion": "number" // (required) Always 1
}
```

### Implementation Examples

For complete implementation examples in multiple programming languages including Node.js, Python, and coordinated PWA integration, see:

**📚 [Events API Implementation Examples](../api/examples.md#events-api-examples)**


### Response Handling

#### Success Response (HTTP 200)

```json
{
  "success": true,
  "code": 7000,
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

#### Error Responses

| **HTTP Status** | **Description** | **Action Required** |
|-----------------|-----------------|-------------------|
| 400 | Bad Request - Invalid data format | Fix request payload |
| 401 | Unauthorized - Invalid credentials | Check API keys |
| 429 | Too Many Requests - Rate limited | Implement exponential backoff |
| 499 | Client Closed Request - Request timeout | Retry with proper timeout |
| 500 | Internal Server Error | Retry after delay |

#### Error Response Format

```json
{
  "success": false,
  "code": 7001,
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

### Best Practices

#### Event Design
- **Unique Event IDs**: Generate unique event IDs to prevent duplicates
- **Consistent Timestamps**: Use Unix timestamps for time fields
- **Required Fields**: Always include all mandatory attributes
- **Event Naming**: Use clear, consistent event type naming

#### Error Handling & Reliability
- **Retry Logic**: Implement exponential backoff for transient failures
- **Queue Events**: Queue events locally for reliability during outages
- **Monitoring**: Log and monitor event posting success rates
- **Idempotency**: Design events to be safely retryable

#### Security & Performance
- **API Key Security**: Store API keys securely, rotate regularly
- **Rate Limiting**: Respect rate limits, implement client-side throttling  
- **Payload Size**: Keep event payloads under recommended limits
- **Batch Processing**: Consider batching for high-volume scenarios

---

## Complete Integration Example

For a complete example showing how PWA-to-Native and Server-to-Server events work together in a coordinated booking flow, see:

**📚 [Coordinated Event Tracking Example](../api/examples.md#coordinated-event-tracking)**

This comprehensive example demonstrates:
- **Complete User Journey Tracking**: PWA events capture user interactions and decision-making
- **Business Event Reliability**: Server events ensure critical business events are recorded  
- **Data Consistency**: Both flows share common identifiers (session IDs, booking IDs)
- **Failure Resilience**: Frontend events continue even if server events fail
- **Production-Ready Code**: Error handling, retry logic, and monitoring

---

**Next Steps**: 
- Review [JavaScript Bridge](./javascript-bridge.md) for detailed PWA event implementation
- Check [API Examples](../api/examples.md) for server-side integration examples
- See [Security Guidelines](../security.md) for event data protection requirements
