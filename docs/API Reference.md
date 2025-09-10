---
sidebar_position: 4
---
# API Reference

This document provides a quick reference for Rapido's Partner Integration APIs. For detailed documentation, see the [API Overview](./api/overview.md) and [Token Validation API](./api/token-validation.md).

## Partner Backend APIs

### Validate User Token

**Purpose**: Validate authentication tokens received from your PWA and retrieve user information.

**Endpoint**: `POST /fetch-user-details`

**Base URLs**:
- **Production**: `<rapido-host-url-prod>/api/ota`
- **Staging**: `<rapido-host-url-staging>/api/ota`

**Authentication**: Partner API Key required

### Post Business Events

**Purpose**: Send business events (orders, bookings, payments) from your backend to Rapido's analytics system.

**Endpoint**: `POST /postEvent`

**Base URL**: `https://api.rapido.bike/api/ota`

**Authentication**: Partner API Key required

#### Events API Request Format
```http
POST /api/ota/postEvent HTTP/1.1
Host: api.rapido.bike
Content-Type: application/json
x-client-id: CLIENT_ID
x-client-service: flights/hotels
x-client-app-id: your-app-id
Authorization: CLIENT_KEY
```

#### Events API Request Body
```json
{
  "userId": "user_id_from_rapido",
  "event": {
    "type": "order.confirmed",
    "id": "evt_unique_event_id"
  },
  "attributes": {
    "orderId": "BOOKING_123",
    "orderStatus": "CONFIRMED",
    "amount_total": 8500,
    "location_origin_lat": 28.5562,
    "location_origin_long": 77.1000,
    "location_dest_lat": 12.9716,
    "location_dest_long": 77.5946,
    "start_time": 1708156800,
    "end_time": 1708163000,
    "hostStatus": "CONFIRMED",
    "tz": "Asia/Kolkata"
  },
  "schemaVersion": 1
}
```

#### Events API Success Response (HTTP 200)
```json
{
  "success": true,
  "code": 7000,
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

#### Token Validation Request Format
```http
POST /api/ota/fetch-user-details HTTP/1.1
Host: <rapido-host-url>
Content-Type: application/json
authorization: CLIENT_KEY
x-client-id: CLIENT_ID
x-client-service: <your_service_offering>
x-client-appid: <your_app_id>
```

#### Request Body
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success Response (HTTP 200)
```json
{
  "success": true,
  "code": 7000,
  "data": {
    "user": {
      "name": "Joe Doe",
      "mobile": "7259206810"
    }
  },
  "timestamp": "2025-09-04T12:52:38.061Z",
  "requestId": "092a3dd0-898e-11f0-bf23-81aa54c4116d"
}
```

#### Error Response (HTTP 401)
```json
{
  "success": false,
  "code": 7001,
  "error": {
    "message": "Token Invalid"
  },
  "timestamp": "2025-09-04T12:45:47.474Z",
  "requestId": "146fa320-898d-11f0-bf23-81aa54c4116d"
}
```

## JavaScript Bridge API

### Methods Available to PWA

| Method | Purpose |
|--------|---------|
| `requestUserToken(metadata)` | Request authentication token from Rapido with metadata |
| `updateLoginStatus(isSuccess, errorMessage)` | Notify native app of login result |
| `storeSessionId(sessionId)` | Store session ID in secure storage |
| `requestSessionId()` | Request stored session ID |
| `logEvents(eventType, propertiesJson)` | Log custom events for analytics and tracking |
| `clearUserToken()` | Clear token and session data |

### Callbacks Required by PWA

| Callback | Purpose |
|----------|---------|
| `window.JSBridge.onTokenReceived(token)` | Receive authentication token |
| `window.JSBridge.onSessionIdReceived(sessionId)` | Receive requested session ID |
| `window.JSBridge.onUserSkippedLogin()` | Handle user declining authentication |
| `window.JSBridge.onEventLogged(result)` | Handle event logging result |
| `window.JSBridge.onTokenCleared()` | Handle successful logout |
| `window.JSBridge.onError(error)` | Handle bridge errors |

## Quick Integration Example

```javascript
// Set up callbacks
window.JSBridge = window.JSBridge || {};
window.JSBridge.onTokenReceived = function(token) {
    // Send to backend for validation
    fetch('/api/auth/rapido-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    }).then(response => response.json())
    .then(data => {
        if (data.success) {
            // Store session securely
            window.NativeJSBridge.storeSessionId(data.sessionId);
            window.NativeJSBridge.updateLoginStatus(true, null);
        }
    });
};

// Request authentication with profile scope
window.NativeJSBridge.requestUserToken({ scope: ["profile"] });

// Track user events
window.NativeJSBridge.logEvents('user_action', JSON.stringify({
    action: 'login_initiated',
    timestamp: new Date().toISOString()
}));
```

---

**For Complete Documentation**:
- [Integration Guide](./integration/basics.md) - Complete implementation flow
- [JavaScript Bridge](./integration/javascript-bridge.md) - Detailed bridge documentation
- [Events Tracking](./integration/events-tracking.md) - Complete events tracking guide (PWA & Server-to-Server)
- [API Examples](./api/examples.md) - Full code samples
- [Security Guidelines](./security.md) - Production security requirements