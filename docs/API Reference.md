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

#### Request Format
```http
POST /api/ota/fetch-user-details HTTP/1.1
Host: <rapido-host-url>
Content-Type: application/json
authorization: CLIENT_KEY
x-client-id: CLIENT_ID
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
    "valid": true,
    "user": {
      "name": "John Doe",
      "mobile": "+91-9876543210"
    }
  },
  "timestamp": "2024-01-15T10:00:30Z",
  "requestId": "req_1234567890"
}
```

#### Error Response (HTTP 401)
```json
{
  "success": false,
  "code": 7001,
  "error": {
    "message": "Token Invalid",
    "details": {
      "field": "token is missing"
    }
  },
  "timestamp": "2024-01-15T10:00:30Z",
  "requestId": "req_1234567890"
}
```

## JavaScript Bridge API

### Methods Available to PWA

| Method | Purpose |
|--------|---------|
| `requestUserToken()` | Request authentication token from Rapido |
| `updateLoginStatus(isSuccess, errorMessage)` | Notify native app of login result |
| `storeSessionId(sessionId)` | Store session ID in secure storage |
| `fetchSessionId()` | Retrieve stored session ID |
| `clearUserToken()` | Clear token and session data |

### Callbacks Required by PWA

| Callback | Purpose |
|----------|---------|
| `window.JSBridge.onTokenReceived(token)` | Receive authentication token |
| `window.JSBridge.onUserSkippedLogin()` | Handle user declining authentication |
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

// Request authentication
window.NativeJSBridge.requestUserToken();
```

---

**For Complete Documentation**:
- [Integration Guide](./integration/basics.md) - Complete implementation flow
- [JavaScript Bridge](./integration/javascript-bridge.md) - Detailed bridge documentation  
- [API Examples](./api/examples.md) - Full code samples
- [Security Guidelines](./security.md) - Production security requirements