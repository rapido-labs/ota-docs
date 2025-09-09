---
title: "Token Validation API"
sidebar_label: "Token Validation"
sidebar_position: 2
---

# Token Validation API

The Token Validation API is the primary endpoint for validating user authentication tokens received from your PWA. This endpoint verifies the token's authenticity and returns user information upon successful validation.

## Endpoint Details

**URL**: `POST /fetch-user-details`

**Purpose**: Validate authentication tokens and retrieve user data

**Authentication**: Partner API Key required

## Request Format

### Headers
```http
POST /ota/fetch-user-details HTTP/1.1
Host: api.rapido.bike
Content-Type: application/json
authorization: CLIENT_KEY
x-client-id: CLIENT_ID
x-client-service: <your_service_offering>
x-client-appid: <your_app_id>
User-Agent: YourApp/1.0.0
```

### Request Body
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | The authentication token received from your PWA via `onTokenReceived` |

#### Validation

```javascript
// Example validation before making API call
function validateTokenRequest(token, clientId) {
    if (!token || typeof token !== 'string') {
        throw new Error('Token is required and must be a string');
    }
    
    if (token.length < 50) {
        throw new Error('Token appears to be invalid (too short)');
    }
    
    if (!clientId || typeof clientId !== 'string') {
        throw new Error('Client ID is required and must be a string');
    }
    
    if (!allowedClients.includes(clientId)) {
        throw new Error('invalid Client ID');
    }
}
    
    return true;
}
```

## Response Format

### Success Response (HTTP 200)

```json
{
    "success": true,
    "code": 7000,
    "data": {
        "user": {
            "name": "John Doe",
            "mobile": "7259206810"
        }
    },
    "timestamp": "2025-09-04T12:52:38.061Z",
    "requestId": "092a3dd0-898e-11f0-bf23-81aa54c4116d"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful requests |
| `code` | number | Response code for success (7000) |
| `data.user.name` | string | User's full name |
| `data.user.mobile` | string | User's phone number |
| `timestamp` | string | ISO timestamp of the response |
| `requestId` | string | Unique request identifier |

### Error Responses

#### Invalid Token (HTTP 401)
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

#### Unauthorized (HTTP 401)
```json
{
    "success": false,
    "error": {
        "code": "UNAUTHORIZED",
        "message": "Invalid or missing Partner API key"
    },
    "timestamp": "2024-01-15T10:00:30Z",
    "requestId": "req_1234567890"
}
```

#### Invalid Request (HTTP 400)
```json
{
    "success": false,
    "code": 7002,
    "error": {
        "message": "ClientID Invalid",
        "details": {}
    },
    "timestamp": "2024-01-15T10:00:30Z",
    "requestId": "req_1234567890"
}
```

#### Rate Limited (HTTP 429)
```json
{
    "success": false,
    "error": {
        "code": "RATE_LIMITED",
        "message": "Rate limit exceeded",
        "details": {
            "limit": 100,
            "remaining": 0,
            "resetTime": "2024-01-15T10:01:00Z"
        }
    },
    "timestamp": "2024-01-15T10:00:30Z",
    "requestId": "req_1234567890"
}
```

## Basic Usage Example

### Making the API Request

```javascript
// Basic API call pattern
async function validateRapidoToken(token) {
    try {
        const response = await fetch('<rapido-host-url>/api/ota/fetch-user-details', {
            method: 'POST',
            headers: {
                'authorization': process.env.CLIENT_KEY,
                'Content-Type': 'application/json',
                'x-client-id': process.env.CLIENT_ID,
                'x-client-service': '<your_service_offering>',
                'x-client-appid': '<your_app_id>'
            },
            body: JSON.stringify({ token })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Token is valid - process user data
            return {
                valid: true,
                user: result.data.user
            };
        } else {
            // Token validation failed
            return {
                valid: false,
                error: result.error?.message
            };
        }
        
    } catch (error) {
        // Network or parsing error
        return {
            valid: false,
            error: 'Network error during validation'
        };
    }
}

// Usage in your authentication endpoint
app.post('/api/auth/rapido-login', async (req, res) => {
    const { token } = req.body;
    
    // Validate with Rapido API
    const validation = await validateRapidoToken(token);
    
    if (validation.valid) {
        // Create user session and respond
        const sessionId = await createUserSession(validation.user);
        res.json({
            success: true,
            sessionId: sessionId, // Will be stored in Rapido's secure storage
            user: validation.user
        });
    } else {
        res.status(401).json({
            success: false,
            error: validation.error || 'Authentication failed'
        });
    }
});
```

**For complete implementation examples in multiple languages, see [API Examples](./examples.md).**

## Best Practices

### Security
1. **Store API keys securely** - Use environment variables or secure key management
2. **Validate all inputs** - Check token format and client ID before API calls
3. **Implement request signing** - Use HMAC signing for additional security (optional)
4. **Use HTTPS only** - Never make API calls over HTTP

### Performance
1. **Implement caching** - Cache valid token responses for a short duration
2. **Use connection pooling** - Reuse HTTP connections for better performance
3. **Set appropriate timeouts** - Default to 10 seconds for API calls
4. **Implement retries** - Retry failed requests with exponential backoff

### Error Handling
1. **Handle all error codes** - Implement specific handling for each error type
2. **Log errors appropriately** - Log API errors for debugging but don't expose sensitive data
3. **Provide user feedback** - Return meaningful error messages to your frontend
4. **Implement fallbacks** - Have backup authentication methods if needed

### Monitoring
1. **Track API usage** - Monitor request volume and success rates
2. **Set up alerts** - Alert on high error rates or API unavailability
3. **Log request IDs** - Include request IDs in logs for easier debugging
4. **Monitor performance** - Track API response times

## Session Management Integration

After successful token validation, you'll need to implement session management for seamless user experience:

### Key Integration Points

1. **Return Session ID**: Your authentication endpoint should return a `sessionId` that will be stored in Rapido's secure storage
2. **Session Validation**: Implement a session validation endpoint for checking stored sessions
3. **Session Cleanup**: Handle session expiration and cleanup appropriately

### Basic Session Flow

```javascript
// After successful token validation in your backend
app.post('/api/auth/rapido-login', async (req, res) => {
    // ... token validation logic ...
    
    if (tokenIsValid) {
        // Generate secure session ID
        const sessionId = generateSecureSessionId();
        
        // Store in your database with expiration
        await createUserSession(userId, sessionId);
        
        res.json({
            success: true,
            sessionId: sessionId, // Rapido will store this securely
            user: userData
        });
    }
});

// Session validation endpoint
app.post('/api/auth/validate-session', async (req, res) => {
    const { sessionId } = req.body;
    const isValid = await validateUserSession(sessionId);
    
    res.json({ 
        valid: isValid,
        // Include user data if valid
    });
});
```

### Session Management Best Practices

1. **Session Expiration**: Set reasonable session lifetimes (24-48 
hours)
2. **Validation Strategy**: Always validate sessions server-side 
before granting access
3. **Security**: Never store sessions in browser storage - use 
Rapido's secure storage only
4. **Error Handling**: Gracefully handle session expiration by 
requesting re-authentication

**For complete session management implementation with frontend integration, see [API Examples](./examples.md) and [JavaScript Bridge](../integration/javascript-bridge.md) documentation.**

---

**Next Steps**:
- Review [API Examples](./examples.md) for more implementation samples
- Check [Integration Guide](../integration/basics.md) for complete integration flow
- See [Security Guidelines](../security.md) for production deployment best practices