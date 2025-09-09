---
title: "FAQ"
sidebar_label: "FAQ"
sidebar_position: 5
---

# Frequently Asked Questions

Here are answers to the most common questions about integrating with Rapido's Partner PWA platform.

## Authentication & Tokens

### What happens if a token is invalid?

When you try to validate an invalid token, Rapido's API will return an error:

```json
{
    "success": false,
    "code": "INVALID_TOKEN",
    "error": {
        "message": "The provided token is invalid"
    }
}
```

Your backend should handle this by returning an authentication error to your PWA, which should then request a new token using `requestUserToken()`.

### Can I cache or store tokens for later use?

**No, absolutely not.** Tokens are designed to be single-use. Never store tokens in:
- localStorage or sessionStorage
- Database
- Cache systems
- Log files

Instead, store the session ID returned by your backend after successful token validation.

### What if the user doesn't give consent?

If a user denies consent in Rapido's consent screen:
1. The `onTokenReceived` callback will **not** be triggered
2. Your PWA should implement a timeout mechanism to detect this scenario
3. Show an appropriate message explaining that consent is required
4. Provide an option to retry the authentication flow

```javascript
function initiateAuthWithTimeout() {
    let timeoutId;
    let authReceived = false;
    
    // Set up timeout
    timeoutId = setTimeout(() => {
        if (!authReceived) {
            showConsentDeniedMessage();
        }
    }, 30000); // 30 seconds timeout
    
    // Override the original callback
    const originalCallback = window.JSBridge.onTokenReceived;
    window.JSBridge.onTokenReceived = function(token) {
        authReceived = true;
        clearTimeout(timeoutId);
        originalCallback(token);
    };
    
    // Request token
    window.NativeJSBridge.requestUserToken();
}
```

## Session/Cookies

### What if `sessionId` is not available in the PWA URL?

This is the normal flow for first-time users or when sessions have expired. Your PWA should:

1. Check for a stored session using `requestSessionId()`
2. If no stored session exists, call `requestUserToken()` to initiate authentication

```javascript
function checkAuthentication() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    
    if (sessionId) {
        // Validate session from URL parameter
        validateSession(sessionId);
    } else {
        // Check for stored session
        if (window.NativeJSBridge?.requestSessionId) {
            // Set up callback for stored session check
            window.JSBridge.onSessionIdReceived = function(storedSession) {
                if (storedSession && storedSession !== 'null') {
                    validateSession(storedSession);
                } else {
                    // No session - request authentication
                    requestAuthentication();
                }
            };
            window.NativeJSBridge.requestSessionId();
        } else {
            requestAuthentication();
        }
    }
}
```

## Technical Integration

### Why isn't `onTokenReceived` being called?

Common reasons and solutions:

1. **Function not properly attached to JSBridge**
   ```javascript
   // ❌ Wrong - function exists but not attached to JSBridge
   function onTokenReceived(token) { /* ... */ }
   
   // ✅ Correct - properly attached to JSBridge
   window.JSBridge.onTokenReceived = function(token) { /* ... */ };
   ```

2. **Function defined after token request**
   ```javascript
   // ❌ Wrong order
   window.NativeJSBridge.requestUserToken({ scope: ["profile"] });
   window.JSBridge.onTokenReceived = function(token) { /* ... */ };
   
   // ✅ Correct order
   window.JSBridge.onTokenReceived = function(token) { /* ... */ };
   window.NativeJSBridge.requestUserToken({ scope: ["profile"] });
   ```

3. **Running outside Rapido app**
   ```javascript
   // Check if running in Rapido environment
   if (!window.NativeJSBridge) {
       console.log('Not running in Rapido app');
       // Handle alternative authentication
   }
   ```

### What other JSBridge methods are available?

Besides `requestUserToken()`, the JSBridge provides additional methods for complete authentication flow management:

#### 1. `updateLoginStatus(isSuccess, errorMessage)`
**Purpose**: Notify the native app about login results after processing tokens.
```javascript
// Call after successfully processing onTokenReceived
window.NativeJSBridge.updateLoginStatus(true, null);

// Call on failure with error message
window.NativeJSBridge.updateLoginStatus(false, 'Token validation failed');
```

#### 2. `clearUserToken()`
**Purpose**: Clear both authentication token and session data from secure storage.
```javascript
// Clear all user authentication data
window.NativeJSBridge.clearUserToken();
// This triggers onTokenCleared callback
```

#### 3. Additional Callbacks
Your PWA should also implement these callbacks:

```javascript
// Called when token/session is successfully cleared
window.JSBridge.onTokenCleared = function() {
    console.log('User logged out successfully');
    // Redirect to login page or show logged out state
};

// Called when JSBridge encounters errors
window.JSBridge.onError = function(error) {
    console.error('JSBridge Error:', error);
    // Handle bridge-level errors appropriately
};
```

## Development & Testing

### How do I test my integration without the Rapido app?

For development and testing, you can create a mock bridge:

```javascript
// Development helper - DO NOT use in production
function createMockBridge() {
    if (window.location.hostname === 'localhost' && !window.NativeJSBridge) {
        window.NativeJSBridge = {
            requestUserToken: function() {
                console.log('Mock: Requesting token');
                // Simulate consent screen delay
                setTimeout(() => {
                    if (window.JSBridge.onTokenReceived) {
                        window.JSBridge.onTokenReceived('mock-token-' + Date.now());
                    }
                }, 2000);
            },
            storeSessionId: function(sessionId) {
                console.log('Mock: Storing session', sessionId);
                localStorage.setItem('mockRapidoSession', sessionId);
            },
            requestSessionId: function() {
                const session = localStorage.getItem('mockRapidoSession');
                console.log('Mock: Requesting session', session);
                setTimeout(() => {
                    if (window.JSBridge.onSessionIdReceived) {
                        window.JSBridge.onSessionIdReceived(session);
                    }
                }, 100);
            }
        };
        console.log('Mock Rapido bridge created for development');
    }
}

// Only use in development
if (process.env.NODE_ENV === 'development') {
    createMockBridge();
}
```

### Can I test with real tokens in development?

Yes, but use Rapido's staging environment:
- **Staging API**: `<rapido-host-url-staging>/api/ota`
- **Staging tokens** are provided for testing
- Contact the integration team for staging credentials

Never use production tokens in development environments.

### What's the difference between client ID and API key?

- **Client ID**: Public identifier for your PWA, used in frontend `requestUserToken()` calls
- **API Key**: Secret key for backend authentication with Rapido's APIs

```javascript
// Client identification handled automatically by native app
window.NativeJSBridge.requestUserToken();

// API Key - ONLY use in backend
const headers = {
    'authorization': `${process.env.CLIENT_KEY}`
};
```

## Troubleshooting

### My integration works in development but fails in production

Common production issues:

1. **Environment variables not set**
   ```bash
   # Ensure these are set in production
   CLIENT_KEY=your-production-key
   CLIENT_ID=your-client-id
   ```

2. **Wrong API endpoints**
   ```javascript
   // Use production URLs in production
   const baseURL = process.env.NODE_ENV === 'production'
       ? '<rapido-host-url-prod>/api/ota'
       : '<rapido-host-url-staging>/api/ota';
   ```

3. **HTTPS certificate issues**
   - Ensure your SSL certificate is valid
   - Check certificate chain is complete
   - Verify certificate is not expired

### Error: "CORS policy blocks request"

This usually indicates your domain is not whitelisted. Contact Rapido's integration team to:
1. Add your production domain to the whitelist
2. Verify your staging domain is configured correctly
3. Check CORS configuration in your application

### Users see "Authentication failed" repeatedly

Check these common causes:

1. **Token expiry handling**
   ```javascript
   // Handle token expiry gracefully
   if (error.code === 'INVALID_TOKEN') {
       // Clear any stored session
       if (window.NativeJSBridge?.storeSessionId) {
           window.NativeJSBridge.storeSessionId('');
       }
       // Request new authentication with profile scope
       window.NativeJSBridge.requestUserToken({ scope: ["profile"] });
   }
   ```

## Contact & Support

### How do I get help with my integration?

1. **Check the documentation**: Start with our [Quick Start Guide](./quickstart.md)
2. **Review examples**: See [API Examples](./api/examples.md) for implementation patterns
3. **Check troubleshooting**: Common issues are covered in [Troubleshooting](./troubleshooting.md)
4. **Contact support**: Email [partner-support@rapido.bike](mailto:partner-support@rapido.bike)

### How do I report a security issue?

For security-related issues, contact [security@rapido.bike](mailto:security@rapido.bike) directly. Please do not post security issues in public forums.

### Can I request new features or API endpoints?

Yes! Send feature requests to [partner-api-support@rapido.bike](mailto:partner-api-support@rapido.bike) with:
- Detailed description of the feature
- Use case and business justification
- Expected timeline for implementation

---

**Still have questions?** Contact our integration team at [partner-support@rapido.bike](mailto:partner-support@rapido.bike) or check our [Troubleshooting Guide](./troubleshooting.md) for more detailed problem-solving steps.
