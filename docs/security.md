---
title: "Security Considerations"
sidebar_label: "Security"
sidebar_position: 4
---

# Security Considerations

Security is paramount in Rapido's Partner Integration. This guide outlines comprehensive security measures, best practices, and implementation guidelines to ensure your integration maintains the highest security standards.

## Security Architecture Overview

Rapido's integration employs multiple layers of security to protect user data and prevent unauthorized access:

### 1. Transport Layer Security
- **TLS 1.3 Encryption**: All communications between your PWA, backend, and Rapido servers use the latest TLS encryption
- **HTTPS Only**: No HTTP communications allowed in any part of the integration

### 2. Authentication & Authorization
- **Short-lived Tokens**: Authentication tokens expire within 15 minutes to minimize exposure
- **API Key Authentication**: Server-to-server communication secured with Partner API keys

### 3. Data Protection
- **Token Encryption**: All tokens are encrypted both in transit and at rest
- **Minimal Data Exposure**: Only explicitly consented user data is shared
- **Secure Session Storage**: Session IDs stored in Rapido's encrypted storage, not browser storage

## Critical Security Requirements

### ❌ What You Must NOT Do

1. **Never Store Tokens in Browser Storage**
   ```javascript
   // ❌ NEVER DO THIS
   localStorage.setItem('rapidoToken', token);
   sessionStorage.setItem('rapidoToken', token);
   ```

2. **Never Log Sensitive Information**
   ```javascript
   // ❌ NEVER DO THIS
   console.log('Received token:', token);
   
   // ✅ DO THIS INSTEAD
   console.log('Token received successfully');
   ```

3. **Never Expose API Keys Client-Side**
   ```javascript
   // ❌ NEVER DO THIS in client-side code
   const apiKey = 'your-partner-api-key';
   ```

### ✅ What You Must DO

1. **Always Use HTTPS**
   ```javascript
   // ✅ Correct configuration
   const API_BASE_URL = 'https://your-api.com'; // Never http://
   ```

2. **Always Validate Tokens Server-Side**
   ```javascript
   // ✅ Proper token validation flow
   async function validateUserToken(token) {
       // Send token to your backend for validation with Rapido API
       // See API Examples documentation for complete backend implementation
       const isValid = await callYourTokenValidationEndpoint(token);
       return isValid;
   }
   ```

3. **Always Use Rapido's Secure Storage**
   ```javascript
   // ✅ Correct session storage
   function storeSession(sessionId) {
       if (window.NativeJSBridge && window.NativeJSBridge.storeSessionId) {
           return window.NativeJSBridge.storeSessionId(sessionId);
       }
   }
   
   // ✅ Correct session retrieval (iOS-compatible callback pattern)
   function checkStoredSession() {
       if (window.NativeJSBridge && window.NativeJSBridge.requestSessionId) {
           // Set up callback first
           window.JSBridge.onSessionIdReceived = function(sessionId) {
               if (sessionId && sessionId !== 'null') {
                   // Validate session with your backend
                   validateStoredSession(sessionId);
               } else {
                   // Show login screen
                   requestNewAuthentication();
               }
           };
           
           // Request stored session
           window.NativeJSBridge.requestSessionId();
       } else {
           requestNewAuthentication();
       }
   }
   ```

## Implementation Security Guidelines

### Frontend Security

```javascript
// ✅ Secure token handling implementation
window.JSBridge = window.JSBridge || {};

window.JSBridge.onTokenReceived = function(token) {
    // Validate token format without logging it
    if (!token || typeof token !== 'string' || token.length < 50) {
        console.error('Invalid token format received');
        return;
    }
    
    // Immediately send to backend for validation - never store locally
    // See API Examples documentation for complete implementation
    validateTokenWithBackend(token)
        .then(result => {
            if (result.success) {
                // Store only session ID securely in Rapido's encrypted storage
                if (window.NativeJSBridge && window.NativeJSBridge.storeSessionId) {
                    window.NativeJSBridge.storeSessionId(result.sessionId);
                }
                
                // Notify native app of successful authentication
                if (window.NativeJSBridge && window.NativeJSBridge.updateLoginStatus) {
                    window.NativeJSBridge.updateLoginStatus(true, null);
                }
                
                // Redirect to authenticated area
                redirectToApp();
            } else {
                // Notify native app of authentication failure
                if (window.NativeJSBridge && window.NativeJSBridge.updateLoginStatus) {
                    window.NativeJSBridge.updateLoginStatus(false, result.error || 'Authentication failed');
                }
                // Handle authentication error appropriately
            }
        })
        .catch(error => {
            console.error('Authentication failed');
            
            // Notify native app of network/processing error
            if (window.NativeJSBridge && window.NativeJSBridge.updateLoginStatus) {
                window.NativeJSBridge.updateLoginStatus(false, 'Network error during authentication');
            }
            
            // Handle authentication error appropriately
        });
}

// ✅ Secure session management flow
window.JSBridge.onSessionIdReceived = function(sessionId) {
    if (sessionId && sessionId !== 'null') {
        console.log('Stored session found');
        // Validate session with backend immediately - never trust client-side sessions
        // See API Examples documentation for complete backend validation implementation
        validateSessionWithBackend(sessionId)
            .then(result => {
                if (result.valid) {
                    // Session is valid - proceed to app
                    redirectToApp();
                } else {
                    // Session expired - clear and re-authenticate
                    clearStoredSession();
                    requestNewAuth();
                }
            })
            .catch(error => {
                console.error('Session validation failed');
                requestNewAuth();
            });
    } else {
        console.log('No stored session - requesting authentication');
        requestNewAuth();
    }
};

function clearStoredSession() {
    if (window.NativeJSBridge && window.NativeJSBridge.clearUserToken) {
        window.NativeJSBridge.clearUserToken();
    }
}

function requestNewAuth() {
    if (window.NativeJSBridge && window.NativeJSBridge.requestUserToken) {
        window.NativeJSBridge.requestUserToken({ scope: ["profile"] });
    }
}
```

### Backend Security

**Critical Backend Security Requirements:**

1. **Rate Limiting**: Implement rate limiting on authentication endpoints to prevent abuse
   ```javascript
   // ✅ Implement rate limiting for auth endpoints
   // See API Examples documentation for complete rate limiting implementation
   ```

2. **Secure Environment Variables**: Store API keys and sensitive configuration securely
   ```javascript
   // ✅ Always use environment variables for sensitive data
   const apiKey = process.env.RAPIDO_PARTNER_API_KEY;
   const clientId = process.env.CLIENT_ID;
   
   // ✅ Validate required environment variables at startup
   if (!apiKey || !clientId) {
       throw new Error('Missing required environment variables');
   }
   ```

3. **Secure Session Generation**: Use cryptographically secure random session IDs
   ```javascript
   // ✅ Generate secure session IDs
   const crypto = require('crypto');
   const sessionId = crypto.randomBytes(32).toString('hex');
   ```

4. **Session Expiration**: Always set expiration times for sessions
   ```javascript
   // ✅ Set reasonable session expiration (24-48 hours)
   const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
   ```

**See [API Examples](api/examples.md) for complete backend security implementation.**

**Critical Security Reminder**: The security of your users' data is a shared responsibility. While Rapido provides secure infrastructure and APIs, your implementation must also follow security best practices.

**Security Contact**: For security-related questions, contact [security@rapido.bike](mailto:security@rapido.bike)