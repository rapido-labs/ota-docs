---
title: "Using the Rapido JS Bridge"
sidebar_label: "JavaScript Bridge"
sidebar_position: 2
---

# Using the Rapido JavaScript Bridge

The Rapido JavaScript Bridge provides secure communication between your PWA and the Rapido mobile application. This page documents all available methods, event handlers, and best practices for implementation.

## Bridge Overview

The JavaScript Bridge is exposed through the `window.NativeJSBridge` object when your PWA runs inside the Rapido app. It provides five core functionalities:

1. **Authentication Token** - Request user authentication tokens
2. **Login Status** - Notify app about authentication results
3. **Session Storage** - Securely store and retrieve session IDs
4. **Event Logging** - Track custom events with structured data for analytics
5. **Event Handling** - Receive callbacks from Rapido

## Available Methods

### requestUserToken(metadata)

Initiates the user authentication flow by requesting a token from Rapido.

#### Parameters
- `metadata` (object, required): Authentication metadata specifying the required scope. Use `{ scope: ["profile"] }` to request user profile access.

#### Usage
```javascript
function initiateLogin() {
    if (window.NativeJSBridge && window.NativeJSBridge.requestUserToken) {
        window.NativeJSBridge.requestUserToken({ scope: ["profile"] });
    } else {
        console.error('Rapido NativeJSBridge not available');
    }
}
```

#### Behavior
1. Triggers Rapido's consent screen
2. User approves or denies access
3. On approval, calls your `onTokenReceived` function
4. On denial, calls your `onUserSkippedLogin` function

#### Error Handling
```javascript
function safeRequestToken() {
    try {
        if (!window.NativeJSBridge) {
            throw new Error('Running outside Rapido app');
        }
        
        if (typeof window.NativeJSBridge.requestUserToken !== 'function') {
            throw new Error('requestUserToken method not available');
        }
        
        window.NativeJSBridge.requestUserToken({ scope: ["profile"] });
        
    } catch (error) {
        console.error('Failed to request token:', error);
        // Handle gracefully - maybe show manual login option
        showManualLoginOption();
    }
}
```

### updateLoginStatus(isSuccess, errorMessage)

Notifies the native app about the login result after receiving a token. This should be called by the PWA after processing the `onTokenReceived` callback.

#### Parameters
- `isSuccess` (boolean, required): `true` if authentication was successful, `false` if failed
- `errorMessage` (string, optional): Error message if `isSuccess` is `false`, otherwise pass `null`

#### Usage
```javascript
// Call this in your onTokenReceived callback
function onTokenReceived(token) {
    console.log('Token received from Rapido');
    // Process the token (validate, create session, etc.)
    processToken(token)
        .then((sessionData) => {
            // IMPORTANT: Store session/cookie first
            storeUserSession(sessionData);

            // Then notify app that login was successful
            if (window.NativeJSBridge && window.NativeJSBridge.updateLoginStatus) {
                window.NativeJSBridge.updateLoginStatus(true, null);
            }

            // Show dashboard or redirect user
            showDashboard();
        })
        .catch((error) => {
            // Notify app that login failed
            if (window.NativeJSBridge && window.NativeJSBridge.updateLoginStatus) {
                window.NativeJSBridge.updateLoginStatus(false, error.message);
            }

            // Handle error appropriately
            showErrorMessage(error.message);
        });
}
```

> **Important Note**: In success case, the `updateLoginStatus` function should be called **after** storing the session/cookie. Once the popup is closed, user should ideally be in logged-in state.

#### Best Practices
```javascript
// Always call updateLoginStatus after processing onTokenReceived
window.JSBridge.onTokenReceived = function(token) {
    try {
        // Your authentication logic here
        const sessionData = processAuthToken(token);

        if (sessionData) {
            // Store session/cookie data first
            localStorage.setItem('userSession', JSON.stringify(sessionData));

            // Then notify success - user is now in logged-in state
            window.NativeJSBridge.updateLoginStatus(true, null);
            redirectToUserDashboard();
        } else {
            // Notify failure with reason
            window.NativeJSBridge.updateLoginStatus(false, 'Token processing failed');
            showRetryOption();
        }
    } catch (error) {
        // Always notify failure on exceptions
        window.NativeJSBridge.updateLoginStatus(false, error.message);
        handleAuthenticationError(error);
    }
};
```

### storeSessionId(sessionId)

Securely stores a session ID in Rapido's encrypted storage.

#### Parameters
- `sessionId` (string, required): The session ID to store

#### Returns
- `string`: "SUCCESS" on success, "ERROR:message" on failure

#### Usage
```javascript
function saveSession(sessionId) {
    if (window.NativeJSBridge && window.NativeJSBridge.storeSessionId) {
        try {
            const result = window.NativeJSBridge.storeSessionId(sessionId);
            if (result === 'SUCCESS') {
                console.log('Session stored successfully');
            } else {
                console.error('Failed to store session:', result);
            }
        } catch (error) {
            console.error('Failed to store session:', error);
        }
    }
}
```

#### Best Practices
```javascript
function secureStoreSession(sessionId) {
    // Validate session ID format
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 10) {
        throw new Error('Invalid session ID format');
    }
    
    // Store with error handling
    try {
        if (window.NativeJSBridge && window.NativeJSBridge.storeSessionId) {
            window.NativeJSBridge.storeSessionId(sessionId);
            return true;
        } else {
            console.warn('Session storage not available - user will need to re-authenticate');
            return false;
        }
    } catch (error) {
        console.error('Session storage failed:', error);
        throw error;
    }
}
```

### requestSessionId()

Requests the stored session ID from Rapido's secure storage using a callback pattern for iOS compatibility.

#### Parameters
- None (uses callback pattern)

#### Usage
```javascript
function requestStoredSession() {
    if (window.NativeJSBridge && window.NativeJSBridge.requestSessionId) {
        // IMPORTANT: Set up callback before calling requestSessionId
        window.JSBridge.onSessionIdReceived = function(sessionId) {
            if (sessionId && sessionId !== 'null') {
                console.log('Session found:', sessionId);
                // Process stored session
            } else {
                console.log('No session found');
                // Handle no session case
            }
        };
        
        window.NativeJSBridge.requestSessionId();
    } else {
        console.error('Rapido NativeJSBridge not available');
    }
}
```

#### Behavior
1. Accesses Rapido's secure storage
2. Retrieves encrypted session ID if it exists
3. Calls your `onSessionIdReceived` function with the result
4. Returns `null` if no session exists

#### Error Handling
```javascript
function safeRequestSession() {
    try {
        if (!window.NativeJSBridge) {
            throw new Error('Running outside Rapido app');
        }
        
        if (typeof window.NativeJSBridge.requestSessionId !== 'function') {
            throw new Error('requestSessionId method not available');
        }
        
        // IMPORTANT: Set up callback before calling requestSessionId
        window.JSBridge.onSessionIdReceived = function(sessionId) {
            if (sessionId && sessionId !== 'null') {
                console.log('Session found:', sessionId);
                // Handle existing session (validate with backend)
            } else {
                console.log('No session found');
                // Show login screen
                showLoginScreen();
            }
        };
        
        window.NativeJSBridge.requestSessionId();
        
    } catch (error) {
        console.error('Failed to request session:', error);
        // Handle gracefully - maybe show login option
        showLoginScreen();
    }
}
```

#### Advanced Usage with Validation
```javascript
function validateAndGetSession() {
    // Set up callback for session validation
    window.JSBridge.onSessionIdReceived = async function(sessionId) {
        if (!sessionId || sessionId === 'null') {
            console.log('No stored session found');
            // Show login screen or request new authentication
            return;
        }
        
        // Validate session with your backend API
        // NOTE: See API Examples documentation for complete backend implementation
        try {
            // Call your session validation endpoint
            const isValid = await validateSessionWithYourBackend(sessionId);
            
            if (isValid) {
                // Proceed with authenticated flow (show dashboard, etc.)
                console.log('Session is valid - proceeding to app');
            } else {
                console.log('Stored session is invalid');
                // Clear invalid session and show login
                clearStoredSession();
            }
        } catch (error) {
            console.error('Session validation failed:', error);
            // Handle validation error (show login or retry)
        }
    };
    
    // Trigger session request
    if (window.NativeJSBridge && window.NativeJSBridge.requestSessionId) {
        window.NativeJSBridge.requestSessionId();
    }
}

function clearStoredSession() {
    // Clear by storing empty string
    if (window.NativeJSBridge && window.NativeJSBridge.storeSessionId) {
        window.NativeJSBridge.storeSessionId('');
    }
}
```

### logEvents(eventType, propertiesJson)

Logs custom events with structured data for analytics and tracking purposes.

#### Parameters
- `eventType` (string, required): The type/name of the event to log (e.g., 'user_action', 'page_view', 'custom_event')
- `propertiesJson` (string, optional): A JSON string containing event properties as key-value pairs

#### Usage
```javascript
function trackUserAction(actionName) {
    const properties = {
        action_name: actionName,
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        user_agent: navigator.userAgent
         // add additional properties
    };
    
    if (window.NativeJSBridge && window.NativeJSBridge.logEvents) {
        window.NativeJSBridge.logEvents('<EventType>', JSON.stringify(properties));
    }
}

function trackPageView() {
    const properties = {
        page_name: document.title,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        // add additional properties
    };
    
    window.NativeJSBridge.logEvents('<EventType>', JSON.stringify(properties));
}

```

#### Behavior
1. Accepts the event type as a string and properties as a JSON string
2. Validates the parameters on the native side
3. Parses the properties JSON into a HashMap
4. Logs the event with structured data
5. Calls your `onEventLogged` callback with success/failure status

#### Error Handling
```javascript
function safeLogEvent(eventType, properties) {
    try {
        if (!window.NativeJSBridge) {
            throw new Error('Running outside Rapido app');
        }
        
        if (typeof window.NativeJSBridge.logEvents !== 'function') {
            throw new Error('logEvents method not available');
        }
        
        if (!eventType || typeof eventType !== 'string') {
            throw new Error('eventType must be a non-empty string');
        }
        
        const propertiesJson = JSON.stringify(properties || {});
        window.NativeJSBridge.logEvents(eventType, propertiesJson);
        
    } catch (error) {
        console.error('Failed to log event:', error);
        // Handle gracefully - maybe store for later or use fallback analytics
        storeEventForLater(eventType, properties);
    }
}
```

#### Best Practices
- Use consistent naming conventions for event types (e.g., snake_case)
- Keep property keys as strings
- Always JSON.stringify() the properties object before passing to logEvents
- Avoid deeply nested objects in properties for better performance
- Include timestamp information when relevant
- Limit the size of properties object to avoid large JSON strings
- Handle JSON.stringify() errors if properties contain circular references

## Event Handlers

### onTokenReceived(token)

**CRITICAL**: This function must be set on `window.JSBridge.onTokenReceived` and will be called by Rapido when a user token is available.

#### Parameters
- `token` (string): Encrypted authentication token from Rapido

#### Implementation
```javascript
// Set the callback function directly on JSBridge
window.JSBridge.onTokenReceived = function(token) {
    console.log('Token received from Rapido');
    
    // Validate token parameter
    if (!token || typeof token !== 'string') {
        console.error('Invalid token received');
        handleAuthError('Invalid token received');
        return;
    }
    
    // Process token with your backend
    processReceivedToken(token);
};

async function processReceivedToken(token) {
    try {
        // Show processing state
        showLoadingState('Validating credentials...');
        
        // Send to backend for validation
        const response = await fetch('/api/auth/rapido-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Store session and redirect
            await handleSuccessfulAuth(data);
        } else {
            throw new Error(data.error || 'Authentication failed');
        }
        
    } catch (error) {
        console.error('Token processing failed:', error);
        handleAuthError(error.message);
    } finally {
        hideLoadingState();
    }
}
```

### onUserSkippedLogin()

Called when user declines authentication.

#### Implementation
```javascript
function onUserSkippedLogin() {
    console.log('User skipped login');
    hideLoadingState();
    showLoginForm();
}
```

### onSessionIdReceived(sessionId)

**CRITICAL**: This function must be set on `window.JSBridge.onSessionIdReceived` and will be called by Rapido when a session ID request is processed.

#### Parameters
- `sessionId` (string|null): The retrieved session ID, or `null` if no session exists

#### Implementation
```javascript
// Set the callback function directly on JSBridge
window.JSBridge.onSessionIdReceived = function(sessionId) {
    console.log('Session ID received from Rapido');
    
    // Validate sessionId parameter
    if (sessionId && sessionId !== 'null') {
        console.log('Session found:', sessionId);
        // Handle existing session - validate with backend
        validateExistingSession(sessionId);
    } else {
        console.log('No session found');
        // Show login screen
        showLoginScreen();
    }
};
```

#### Advanced Implementation
```javascript
// Advanced callback with comprehensive error handling
window.JSBridge.onSessionIdReceived = function(sessionId) {
    try {
        // Validate parameter
        if (!sessionId || sessionId === 'null') {
            console.log('No stored session - user needs to authenticate');
            // Show login screen
            return;
        }
        
        // Show processing state
        // showLoadingState('Validating session...');
        
        // Validate session with your backend
        // NOTE: See API Examples documentation for complete backend implementation
        validateSessionWithYourBackend(sessionId)
            .then((isValid) => {
                if (isValid) {
                    // Session is valid - proceed to authenticated state
                    console.log('Session valid - proceeding to app');
                } else {
                    // Session expired or invalid - clear and request new authentication
                    clearStoredSession();
                    // Show login screen
                }
            })
            .catch((error) => {
                console.error('Session validation failed:', error);
                // Handle session validation error appropriately
            })
            .finally(() => {
                // hideLoadingState();
            });
            
    } catch (error) {
        console.error('Session processing failed:', error);
        // Handle session processing error
    }
};
```

### onError(error)

Called when an error occurs during bridge operations.

#### Parameters
- `error` (string): Error message

#### Implementation
```javascript
function onError(error) {
    console.error('JSBridge Error:', error);
    hideLoadingState();
    showErrorMessage('Authentication failed. Please try again.');
}
```

## Bridge Readiness Check

### Why Bridge Readiness Check is Required

The JSBridge interface (`window.NativeJSBridge`) is injected asynchronously by the WebView. Even though `window.onload` fires when the DOM is ready, the JavaScript interface might not be immediately accessible, creating a race condition.

**Bridge readiness check:**
- ✅ **Immediate execution** - No waiting when bridge is ready
- ✅ **Reliable detection** - Actively checks for bridge availability
- ✅ **Graceful fallback** - Continues checking until bridge is ready
- ✅ **Better performance** - Eliminates arbitrary delays

### Implementation

```javascript
// Bridge readiness check with timeout protection
function checkBridgeReady() {
    const maxWaitTime = 5000; // Maximum 5 seconds
    const startTime = window.bridgeCheckStartTime || (window.bridgeCheckStartTime = Date.now());
    
    if (window.NativeJSBridge && typeof window.NativeJSBridge.requestUserToken === 'function') {
        // Bridge confirmed ready - proceed immediately
        console.log('✅ Bridge ready in ' + (Date.now() - startTime) + 'ms');
        window.NativeJSBridge.requestUserToken({ scope: ["profile"] });
    } else if (Date.now() - startTime < maxWaitTime) {
        // Bridge not ready - check again in 10ms
        setTimeout(checkBridgeReady, 10);
    } else {
        // Timeout protection - prevent infinite waiting
        console.error('❌ Bridge failed to initialize within 5 seconds');
        // Show fallback authentication method
    }
}

## Bridge Detection and Compatibility

### Checking Bridge Availability

```javascript
function isBridgeAvailable() {
    return typeof window.NativeJSBridge === 'object' && window.NativeJSBridge !== null;
}

function checkBridgeCapabilities() {
    if (!isBridgeAvailable()) {
        return {
            available: false,
            capabilities: {}
        };
    }
    
    return {
        available: true,
        capabilities: {
            requestUserToken: typeof window.NativeJSBridge.requestUserToken === 'function',
            updateLoginStatus: typeof window.NativeJSBridge.updateLoginStatus === 'function',
            storeSessionId: typeof window.NativeJSBridge.storeSessionId === 'function',
            requestSessionId: typeof window.NativeJSBridge.requestSessionId === 'function'
        }
    };
}

// Usage
const bridge = checkBridgeCapabilities();

if (bridge.available) {
    console.log('Bridge capabilities:', bridge.capabilities);
    
    if (!bridge.capabilities.requestUserToken) {
        console.warn('Token request not supported in this Rapido version');
    }
} else {
    console.log('Running outside Rapido app or bridge not available');
}
```

### Graceful Degradation

```javascript
function initializeWithFallback() {
    const bridge = checkBridgeCapabilities();
    
    if (bridge.available && bridge.capabilities.requestUserToken) {
        // Full bridge functionality available
        initializeRapidoAuth();
    } else if (bridge.available) {
        // Partial bridge functionality
        console.warn('Limited bridge functionality - some features may not work');
        initializeWithLimitedFeatures();
    } else {
        // No bridge - provide alternative authentication
        console.log('Bridge not available - using alternative auth');
        initializeAlternativeAuth();
    }
}
```

## Testing and Debugging

### Debug Helper Functions

```javascript
// Debug utilities for development
const RapidoBridgeDebug = {
    logBridgeInfo() {
        console.group('Rapido Bridge Debug Info');
        console.log('Bridge available:', !!window.NativeJSBridge);
        
        if (window.NativeJSBridge) {
            console.log('Methods available:', {
                requestUserToken: typeof window.NativeJSBridge.requestUserToken,
                storeSessionId: typeof window.NativeJSBridge.storeSessionId,
                requestSessionId: typeof window.NativeJSBridge.requestSessionId
            });
            
            // Try to get stored session
            try {
                // Set up callback for debug session check
                window.JSBridge.onSessionIdReceived = function(sessionId) {
                    console.log('Debug: Stored session:', sessionId);
                };
                window.NativeJSBridge.requestSessionId();
            } catch (e) {
                console.log('Could not request stored session:', e.message);
            }
        }
        
        console.log('JSBridge callback set:', typeof window.JSBridge.onTokenReceived);
        console.groupEnd();
    },
    
    testTokenCallback(mockToken = 'test-token-123') {
        if (typeof window.JSBridge.onTokenReceived === 'function') {
            console.log('Testing token callback with mock token');
            window.JSBridge.onTokenReceived(mockToken);
        } else {
            console.error('onTokenReceived not defined');
        }
    },
    
    simulateBridgeEnvironment() {
        if (!window.NativeJSBridge) {
            console.log('Creating mock NativeJSBridge for testing');
            window.NativeJSBridge = {
                requestUserToken: () => {
                    console.log('Mock: requestUserToken called');
                    setTimeout(() => {
                        if (window.JSBridge.onTokenReceived) {
                            window.JSBridge.onTokenReceived('mock-token-' + Date.now());
                        }
                    }, 1000);
                },
                storeSessionId: (sessionId) => {
                    console.log('Mock: storing session', sessionId);
                    localStorage.setItem('mockRapidoSession', sessionId);
                    return 'SUCCESS';
                },
                requestSessionId: () => {
                    console.log('Mock: requesting session');
                    const session = localStorage.getItem('mockRapidoSession');
                    setTimeout(() => {
                        if (window.JSBridge.onSessionIdReceived) {
                            window.JSBridge.onSessionIdReceived(session);
                        }
                    }, 100);
                }
            };
        }
    }
};

// Use in development
if (process.env.NODE_ENV === 'development') {
    window.RapidoBridgeDebug = RapidoBridgeDebug;
}
```

### Testing Checklist

When testing your JavaScript Bridge integration:

- [ ] **Bridge Detection**: Verify bridge availability detection works
- [ ] **Token Request**: Test `requestUserToken` with valid client ID
- [ ] **Consent Flow**: Test both approval and denial scenarios
- [ ] **Token Processing**: Verify `onTokenReceived` callback works
- [ ] **Session Storage**: Test `storeSessionId` and `requestSessionId`
- [ ] **Error Handling**: Test with invalid tokens and network failures
- [ ] **Multiple Sessions**: Test session replacement and updates
- [ ] **Bridge Unavailable**: Test graceful degradation when bridge is not available
- [ ] **Bridge Readiness**: Test bridge readiness check with timeout protection

---

**Next Steps**:
- Review [Integration Basics](./basics.md) for complete implementation flow
- Check [API Examples](../api/examples.md) for complete session management implementation
- See [Security Guidelines](../security.md) for production security requirements
- Review [Troubleshooting](../troubleshooting.md) for common integration issues