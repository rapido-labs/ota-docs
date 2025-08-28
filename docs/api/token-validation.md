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
x-client-id: client_id
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
        "valid": true,
        "user": {
            "name": "John Doe",
            "mobile": "+91-9876543210"
        },
    },
    "timestamp": "2024-01-15T10:00:30Z",
    "requestId": "req_1234567890"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful requests |
| `code` | number | user defined code for success |
| `data.user.name` | string | User's full name |
| `data.user.mobile` | string | User's phone number (if consented) |
| `data.user.profile` | object | Detailed profile information |

### Error Responses

#### Invalid Token (HTTP 401)
```json
{
    "success": false,
    "code": 7001,
    "error": {
        "message": "Token Invalid",
        "details": {
            "field": "token is missing",
        }
    },
    "timestamp": "2024-01-15T10:00:30Z",
    "requestId": "req_1234567890"
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
            production: 'https://partner-api.rapido.bike/ota',
            staging: 'https://customer.staging.plectrum.dev/api/ota',
            sandbox: 'https://sandbox-api.rapido.bike/partner'
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
                        'x-client-id': clientId
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
        const clientId = process.env.RAPIDO_CLIENT_ID;
        
        const validator = new RapidoTokenValidator(
            process.env.RAPIDO_PARTNER_API_KEY,
            process.env.NODE_ENV === 'production' ? 'production' : 'staging'
        );
        
        const result = await validator.validateToken(token, clientId);
        
        if (result.success && result.data.valid) {
            const userData = result.data.user;
            
            // Create or update user in your database
            const user = await createOrUpdateUser(userData);
            
            // Generate session
            const sessionId = await createUserSession(user.id);
            
            res.json({
                success: true,
                sessionId: sessionId,
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
            'production': 'https://partner-api.rapido.bike/ota',
            'staging': 'https://customer.staging.plectrum.dev/api/ota',
            'sandbox': 'https://sandbox-api.rapido.bike/partner'
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
            'x-client-id': client_id
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
            api_key=os.environ['RAPIDO_PARTNER_API_KEY'],
            environment='production' if os.environ.get('ENV') == 'production' else 'staging'
        )
        
        client_id = os.environ['RAPIDO_CLIENT_ID']
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

---

**Next Steps**:
- Review [API Examples](./examples.md) for more implementation samples
- Check [Integration Guide](../integration/basics.md) for complete integration flow
- See [Security Guidelines](../security.md) for production deployment best practices