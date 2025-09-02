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
    const originalCallback = window.onTokenReceived;
    window.onTokenReceived = function(token) {
        authReceived = true;
        clearTimeout(timeoutId);
        originalCallback(token);
    };
    
    // Request token
    window.NativeJSBridge.requestUserToken('your-client-id');
}
```

## Session/Cookies

### What if `sessionId` is not available in the PWA URL?

This is the normal flow for first-time users or when sessions have expired. Your PWA should:

1. Check for a stored session using `fetchSessionId()`
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
        const storedSession = window.NativeJSBridge?.fetchSessionId();
        if (storedSession && storedSession !== 'null') {
            validateSession(storedSession);
        } else {
            // No session - request authentication
            requestAuthentication();
        }
    }
}
```

## Technical Integration

### Why isn't `onTokenReceived` being called?

Common reasons and solutions:

1. **Function not globally accessible**
   ```javascript
   // ❌ Wrong - inside a module or closure
   (function() {
       function onTokenReceived(token) { /* ... */ }
   })();
   
   // ✅ Correct - globally accessible
   window.onTokenReceived = function(token) { /* ... */ };
   ```

2. **Function defined after token request**
   ```javascript
   // ❌ Wrong order
   window.NativeJSBridge.requestUserToken('client-id');
   window.onTokenReceived = function(token) { /* ... */ };
   
   // ✅ Correct order
   window.onTokenReceived = function(token) { /* ... */ };
   window.NativeJSBridge.requestUserToken('client-id');
   ```

3. **Running outside Rapido app**
   ```javascript
   // Check if running in Rapido environment
   if (!window.NativeJSBridge) {
       console.log('Not running in Rapido app');
       // Handle alternative authentication
   }
   ```

## Development & Testing

### How do I test my integration without the Rapido app?

For development and testing, you can create a mock bridge:

```javascript
// Development helper - DO NOT use in production
function createMockBridge() {
    if (window.location.hostname === 'localhost' && !window.NativeJSBridge) {
        window.NativeJSBridge = {
            requestUserToken: function(clientId) {
                console.log('Mock: Requesting token for', clientId);
                // Simulate consent screen delay
                setTimeout(() => {
                    if (window.onTokenReceived) {
                        window.onTokenReceived('mock-token-' + Date.now());
                    }
                }, 2000);
            },
            storeSessionId: function(sessionId) {
                console.log('Mock: Storing session', sessionId);
                localStorage.setItem('mockRapidoSession', sessionId);
            },
            fetchSessionId: function() {
                const session = localStorage.getItem('mockRapidoSession');
                console.log('Mock: Fetching session', session);
                return session;
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
- **Staging API**: `https://reach-out-to-rapido-team-for-host/api/ota`
- **Staging tokens** are provided for testing
- Contact the integration team for staging credentials

Never use production tokens in development environments.

### What's the difference between client ID and API key?

- **Client ID**: Public identifier for your PWA, used in frontend `requestUserToken()` calls
- **API Key**: Secret key for backend authentication with Rapido's APIs

```javascript
// Client ID - OK to use in frontend
window.NativeJSBridge.requestUserToken('your-client-id');

// API Key - ONLY use in backend
const headers = {
    'authorization': `${process.env.RAPIDO_PARTNER_API_KEY}`
};
```

## Troubleshooting

### My integration works in development but fails in production

Common production issues:

1. **Environment variables not set**
   ```bash
   # Ensure these are set in production
   RAPIDO_PARTNER_API_KEY=your-production-key
   RAPIDO_CLIENT_ID=your-client-id
   ```

2. **Wrong API endpoints**
   ```javascript
   // Use production URLs in production
   const baseURL = process.env.NODE_ENV === 'production'
       ? 'https://partner-api.rapido.bike/ota'
       : 'https://staging-api.rapido.bike/partner';
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
       // Request new authentication
       window.NativeJSBridge.requestUserToken('your-client-id');
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
