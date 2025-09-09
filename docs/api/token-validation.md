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

## Implementation Examples

### Node.js/Express Example

```javascript
const axios = require('axios');

class RapidoTokenValidator {
    constructor(apiKey, environment = 'production') {
        this.apiKey = apiKey;
        this.baseURL = this.getBaseURL(environment);
    }
    
    getBaseURL(environment) {
        const urls = {
            production: '<rapido-host-url-prod>/api/ota',
            staging: '<rapido-host-url-staging>/api/ota',
            sandbox: '<rapido-host-url-sandbox>/api/ota'
        };
        return urls[environment] || urls.production;
    }
    
    async validateToken(token, clientId) {
        try {
            // Validate inputs
            this.validateInputs(token, clientId);
            
            // Make API request
            const response = await axios.post(
                `${this.baseURL}/fetch-user-details`,
                {
                    token: token
                },
                {
                    headers: {
                        'authorization': `${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'YourApp/1.0.0',
                        'x-client-id': clientId,
                        'x-client-service': '<your_service_offering>',
                        'x-client-appid': '<your_app_id>'
                    },
                    timeout: 10000 // 10 seconds
                }
            );
            
            return response.data;
            
        } catch (error) {
            throw this.handleAPIError(error);
        }
    }
    
    validateInputs(token, clientId) {
        if (!token || typeof token !== 'string') {
            throw new Error('Token is required and must be a string');
        }
        
        if (!clientId || typeof clientId !== 'string') {
            throw new Error('Client ID is required and must be a string');
        }
    }
    
    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    handleAPIError(error) {
        if (error.response) {
            // API returned an error response
            const { status, data } = error.response;
            const apiError = new Error(data.error?.message || 'API request failed');
            apiError.status = status;
            apiError.code = data.error?.code;
            apiError.details = data.error?.details;
            return apiError;
        } else if (error.request) {
            // Network error
            return new Error('Network error: Unable to reach Rapido API');
        } else {
            // Other error
            return error;
        }
    }
}

// Usage in Express route
app.post('/api/auth/rapido-login', async (req, res) => {
    try {
        const { token } = req.body;
        const clientId = process.env.CLIENT_ID;
        
        const validator = new RapidoTokenValidator(
            process.env.CLIENT_KEY,
            process.env.NODE_ENV === 'production' ? 'production' : 'staging'
        );
        
        const result = await validator.validateToken(token, clientId);
        
        if (result.success && result.data.valid) {
            const userData = result.data.user;
            
            // Create or update user in your database
            const user = await createOrUpdateUser(userData);
            
            // Generate session
            const sessionId = await createUserSession(user.id);
            
            // IMPORTANT: Return sessionId for storage in Rapido's secure storage
            res.json({
                success: true,
                sessionId: sessionId, // This will be stored via storeSessionId()
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Token validation failed'
            });
        }
        
    } catch (error) {
        console.error('Authentication error:', error);
        
        const status = error.status || 500;
        res.status(status).json({
            success: false,
            error: error.message || 'Authentication failed'
        });
    }
});
```

### Python Example

```python
import requests
import os
import time
import random
import string
from typing import Dict, Any

class RapidoTokenValidator:
    def __init__(self, api_key: str, environment: str = 'production'):
        self.api_key = api_key
        self.base_url = self._get_base_url(environment)
        
    def _get_base_url(self, environment: str) -> str:
        urls = {
            'production': '<rapido-host-url-prod>/api/ota',
            'staging': '<rapido-host-url-staging>/api/ota',
            'sandbox': '<rapido-host-url-sandbox>/api/ota'
        }
        return urls.get(environment, urls['production'])
    
    def validate_token(self, token: str, client_id: str) -> Dict[Any, Any]:
        """Validate a user token with Rapido API"""
        
        # Validate inputs
        self._validate_inputs(token, client_id)
        
        # Prepare request
        url = f"{self.base_url}/fetch-user-details"
        headers = {
            'authorization': f'{self.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'YourApp/1.0.0',
            'x-client-id': client_id,
            'x-client-service': '<your_service_offering>',
            'x-client-appid': '<your_app_id>'
        }
        data = {
            'token': token
        }
        
        try:
            response = requests.post(
                url, 
                json=data, 
                headers=headers, 
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                self._handle_api_error(response)
                
        except requests.RequestException as e:
            raise Exception(f"Network error: {str(e)}")
    
    def _validate_inputs(self, token: str, client_id: str):
        if not token or not isinstance(token, str):
            raise ValueError("Token is required and must be a string")
        
        if not client_id or not isinstance(client_id, str):
            raise ValueError("Client ID is required and must be a string")
    
    def _generate_request_id(self) -> str:
        timestamp = str(int(time.time()))
        random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return f"req_{timestamp}_{random_str}"
    
    def _handle_api_error(self, response):
        try:
            error_data = response.json()
            error_message = error_data.get('error', {}).get('message', 'API request failed')
        except:
            error_message = f"HTTP {response.status_code}: {response.text}"
        
        raise Exception(error_message)

# Usage example
def authenticate_user(token: str) -> Dict[Any, Any]:
    try:
        validator = RapidoTokenValidator(
            api_key=os.environ['CLIENT_KEY'],
            environment='production' if os.environ.get('ENV') == 'production' else 'staging'
        )
        
        client_id = os.environ['CLIENT_ID']
        result = validator.validate_token(token, client_id)
        
        if result.get('success') and result.get('data', {}).get('valid'):
            user_data = result['data']['user']
            
            # Process user authentication
            # ... your user creation/update logic here
            
            return {
                'success': True,
                'user': user_data
            }
        else:
            return {
                'success': False,
                'error': 'Token validation failed'
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
```

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

After successful token validation, implement session management to provide seamless user experience across app launches:

### Frontend Integration

```javascript
// Complete session management flow
window.JSBridge.onTokenReceived = function(token) {
    // Validate token with your backend
    fetch('/api/auth/rapido-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            // Store session ID in Rapido's secure storage
            if (window.NativeJSBridge && window.NativeJSBridge.storeSessionId) {
                const storeResult = window.NativeJSBridge.storeSessionId(result.sessionId);
                
                if (storeResult === 'SUCCESS') {
                    console.log('Session stored successfully');
                }
            }
            
            // Notify Rapido app of successful login
            if (window.NativeJSBridge && window.NativeJSBridge.updateLoginStatus) {
                window.NativeJSBridge.updateLoginStatus(true, null);
            }
            
            // Redirect to main app
            window.location.href = '/dashboard';
        } else {
            handleAuthenticationError(result.error);
        }
    })
    .catch(error => {
        console.error('Authentication failed:', error);
        handleAuthenticationError('Network error');
    });
};

// Check for existing session on app startup
window.JSBridge.onSessionIdReceived = function(sessionId) {
    if (sessionId && sessionId !== 'null') {
        // Validate stored session with backend
        fetch('/api/auth/validate-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        })
        .then(response => response.json())
        .then(result => {
            if (result.valid) {
                // Session is valid - direct access
                window.location.href = '/dashboard';
            } else {
                // Session expired - clear and request new authentication
                clearSessionAndRequestAuth();
            }
        })
        .catch(error => {
            console.error('Session validation failed:', error);
            clearSessionAndRequestAuth();
        });
    } else {
        // No stored session - request authentication
        requestAuthentication();
    }
};

function clearSessionAndRequestAuth() {
    if (window.NativeJSBridge && window.NativeJSBridge.clearUserToken) {
        window.NativeJSBridge.clearUserToken();
    }
    requestAuthentication();
}

function requestAuthentication() {
    if (window.NativeJSBridge && window.NativeJSBridge.requestUserToken) {
        window.NativeJSBridge.requestUserToken({ scope: ["profile"] });
    }
}

// Initialize session check on app load
document.addEventListener('DOMContentLoaded', () => {
    if (window.NativeJSBridge && window.NativeJSBridge.requestSessionId) {
        window.NativeJSBridge.requestSessionId();
    } else {
        requestAuthentication();
    }
});
```

### Backend Session Validation Endpoint

```javascript
// Session validation endpoint
app.post('/api/auth/validate-session', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.json({ valid: false });
        }
        
        // Validate session in your database
        const session = await Session.findOne({
            sessionId,
            expiresAt: { $gt: new Date() }
        }).populate('user');
        
        if (session) {
            // Update last accessed time
            session.lastAccessedAt = new Date();
            await session.save();
            
            res.json({
                valid: true,
                userId: session.userId,
                user: {
                    id: session.user._id,
                    name: session.user.name,
                    email: session.user.email
                }
            });
        } else {
            // Clean up expired session
            await Session.deleteOne({ sessionId });
            res.json({ valid: false });
        }
        
    } catch (error) {
        console.error('Session validation error:', error);
        res.json({ valid: false });
    }
});

```

### Session Management Best Practices

1. **Session Expiration**: Set reasonable session lifetimes (24-48 hours)
2. **Validation Strategy**: Always validate sessions server-side before granting access
3. **Security**: Never store sessions in browser storage - use Rapido's secure storage only
4. **Error Handling**: Gracefully handle session expiration by requesting re-authentication

---

**Next Steps**:
- Review [API Examples](./examples.md) for more implementation samples
- Check [Integration Guide](../integration/basics.md) for complete integration flow
- See [Security Guidelines](../security.md) for production deployment best practices