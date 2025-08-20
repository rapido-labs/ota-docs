---
title: "Quick Start Guide"
sidebar_label: "Quick Start"
sidebar_position: 3
---

# Quick Start Guide

Get your PWA integrated with Rapido in under 30 minutes. This guide provides a step-by-step process with minimal working examples to get you up and running quickly.

## Prerequisites

Before starting, ensure you have:
- ✅ A PWA hosted on **HTTPS** (required for security)
- ✅ Backend server capable of making **HTTPS API calls**
- ✅ Basic knowledge of **JavaScript** and **REST APIs**
- ✅ **Partner credentials** from Rapido (contact integration team if needed)

## Step 1: Implement JavaScript Bridge Interface

Your PWA needs to implement the required callback functions and use Rapido's JavaScript Bridge methods.

### Add the Token Callback Functions

Add these functions to your PWA's main HTML file or JavaScript bundle:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your PWA</title>
</head>
<body>
    <!-- Your PWA content -->
    
    <script>
        // REQUIRED: These functions will be called by Rapido
        function onTokenReceived(token) {
            console.log('Received token from Rapido:', token);
            
            // Send token to your backend for validation
            fetch('/api/auth/rapido-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: token })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store the session ID using Rapido's secure storage
                    if (window.NativeJSBridge && window.NativeJSBridge.storeSessionId) {
                        const result = window.NativeJSBridge.storeSessionId(data.sessionId);
                        if (result === 'SUCCESS') {
                            console.log('Session stored successfully');
                        } else {
                            console.warn('Failed to store session:', result);
                        }
                    }
                    // Redirect to authenticated view
                    window.location.href = '/dashboard';
                } else {
                    console.error('Authentication failed:', data.error);
                }
            })
            .catch(error => {
                console.error('Error during authentication:', error);
            });
        }

        function onUserSkippedLogin() {
            console.log('User skipped login');
            // Handle user declining authentication
        }

        function onError(error) {
            console.error('JSBridge Error:', error);
            // Handle bridge errors
        }

        // Bridge readiness check with timeout protection
        function checkBridgeReady() {
            const maxWaitTime = 5000; // Maximum 5 seconds
            const startTime = window.bridgeCheckStartTime || (window.bridgeCheckStartTime = Date.now());
            
            if (window.NativeJSBridge && typeof window.NativeJSBridge.requestUserToken === 'function') {
                // Bridge is ready, proceed immediately
                console.log('✅ Bridge ready in ' + (Date.now() - startTime) + 'ms');
                initializeAuth();
            } else if (Date.now() - startTime < maxWaitTime) {
                // Bridge not ready, check again in 10ms
                setTimeout(checkBridgeReady, 10);
            } else {
                // Timeout reached, handle gracefully
                console.error('❌ Bridge failed to initialize within 5 seconds');
                // Show fallback authentication or error message
            }
        }

        // Check for existing session or initiate authentication
        function initializeAuth() {
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('sessionId');
            
            if (sessionId) {
                // Session ID provided in URL - validate it
                validateSession(sessionId);
            } else {
                // No session ID - check if we have one stored
                if (window.NativeJSBridge && window.NativeJSBridge.fetchSessionId) {
                    const storedSessionId = window.NativeJSBridge.fetchSessionId();
                    if (storedSessionId && storedSessionId !== 'null') {
                        validateSession(storedSessionId);
                    } else {
                        // No stored session - request new token
                        requestNewToken();
                    }
                } else {
                    requestNewToken();
                }
            }
        }

        function requestNewToken() {
            // Request token from Rapido
            if (window.NativeJSBridge && window.NativeJSBridge.requestUserToken) {
                // Replace 'your-client-id' with your actual client ID from Rapido
                window.NativeJSBridge.requestUserToken('your-client-id');
            } else {
                console.error('Rapido NativeJSBridge interface not available');
            }
        }

        function validateSession(sessionId) {
            // Logic to validate sessionId if any.
        }

        // Initialize authentication when page loads
        window.onload = function() {
            checkBridgeReady();
        };
    </script>
</body>
</html>
```

## Step 2: Backend Token Validation

Implement the backend endpoints to validate tokens and manage sessions.

### Node.js/Express Example

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Endpoint to handle Rapido token authentication
app.post('/api/auth/rapido-login', async (req, res) => {
    try {
        const { token } = req.body;
        
        // Validate token with Rapido's API
        const rapidoResponse = await axios.post('https://partner-api.rapido.bike/ota/fetch-user-details', 
            { token: token },
            {
                headers: {
                    'Authorization': 'Bearer YOUR_PARTNER_API_KEY',
                    'x-client-id': 'YOUR_PARTNER_ID',
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (rapidoResponse.data) {
            const userData = rapidoResponse.data.user;
            
            // Create or update user in your system
            const user = await createOrUpdateUser(userData);
            
            // Generate session ID
            const sessionId = generateSecureSessionId();
            
            // Store session in your database
            await storeSession(sessionId, user.mobile);
            
            res.json({
                success: true,
                sessionId: sessionId,
                user: {
                    mobile: user.mobile,
                    name: user.name,
                    // Don't send sensitive data to frontend
                }
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
});

// Helper functions (implement based on your database)
async function createOrUpdateUser(userData) {
    // Implement user creation/update logic
}

function generateSecureSessionId() {
    // Generate cryptographically secure session ID
}

async function storeSession(sessionId, userId) {
    // Store session in your database with expiration
}

async function getSessionFromDatabase(sessionId) {
    // Retrieve session from your database
}
```

## Step 3: Configure Your PWA URL

Ensure your PWA can handle the `sessionId` parameter in the URL:

```
https://your-pwa.com/app?sessionId={sessionId}
```

### URL Handling Example

```javascript
// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');

if (sessionId) {
    // User has existing session - validate and proceed
    console.log('Found session ID:', sessionId);
} else {
    // No session ID - need to authenticate
    console.log('No session ID found - initiating authentication');
}
```

## Step 4: Test Your Integration

### Testing Checklist

1. **First-time Access Test**:
   - Launch PWA from Rapido without `sessionId`
   - Verify consent screen appears
   - Approve consent and verify `onTokenReceived` is called
   - Verify backend receives and validates token successfully
   - Verify session ID is stored using `storeSessionId`

2. **Returning User Test**:
   - Close and reopen PWA from Rapido
   - Verify PWA is launched with `sessionId` parameter in the URL
   - Verify user is logged in without showing consent screen

3. **Session Storage Test**:
   - Verify stored session ID is retrieved using `fetchSessionId`
   - Verify session validation works correctly

4. **Bridge Readiness Test**:
   - Verify bridge readiness check works correctly
   - Test timeout handling when bridge is not available


### Debug Mode

Add console logging to track the authentication flow:

```javascript
// Enable debug mode for development
const DEBUG_MODE = true;

function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        console.log(`[Rapido Integration] ${message}`, data);
    }
}

// Use throughout your integration
debugLog('Token received', token);
debugLog('Session stored', sessionId);
debugLog('Bridge ready', bridgeCapabilities);
```

## Step 5: Production Checklist

Before going live, ensure:

- [ ] Remove all debug logging and test code
- [ ] Use production Rapido API endpoints
- [ ] Implement proper error handling for all scenarios
- [ ] Set up monitoring for authentication failures
- [ ] Test with actual Rapido app (not web view simulator)
- [ ] Verify HTTPS certificates are valid
- [ ] Implement rate limiting on your authentication endpoints
- [ ] Test bridge readiness check with timeout protection
- [ ] Verify all callback functions are properly implemented

## Common Issues and Quick Fixes

### `onTokenReceived` not called
**Solution**: Ensure the function is globally accessible and not inside a module scope.

### Bridge methods not available
**Solution**: Add bridge readiness check with timeout protection before calling bridge methods.

### Token validation fails
**Solution**: Verify your backend token validation logic and ensure proper error handling.

### Bridge timeout errors
**Solution**: Implement proper bridge readiness check with timeout protection.

### Session storage fails
**Solution**: Check that `storeSessionId` returns "SUCCESS" and handle error cases.

---

**Next Steps**: 
- For detailed implementation guidance, see [Basic Integration Flow](./integration/basics.md)
- For complete JavaScript Bridge documentation, see [JS Bridge API](./integration/javascript-bridge.md)
- For security best practices, see [Security Guidelines](./security.md)