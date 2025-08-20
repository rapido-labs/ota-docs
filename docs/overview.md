---
title: "Integration Overview"
sidebar_label: "Overview"
sidebar_position: 2
---

# Integration Overview

This page provides a comprehensive overview of how Rapido integrates Progressive Web Applications (PWAs) into its ecosystem, enabling seamless Single Sign-On (SSO) for partner applications.

## High-Level Architecture

Rapido's PWA integration follows a security-first approach that prioritizes user consent and data protection while providing a seamless experience.

![PWA Integration Flow Diagram](/img/rapido-pwa-integration-flow.png)

*Figure 1: Complete PWA Integration Flow showing the interaction between Rapido App, Partner PWA, Rapido Server, and Partner Server*

The diagram above illustrates the complete integration flow with the following key components:

- **Rapido App**: The main mobile application that users interact with
- **Partner PWA**: Your Progressive Web Application that integrates with Rapido
- **Rapido Server**: Rapido's backend services for token management and user data
- **Partner Server**: Your backend services for session management and business logic
- **Token Storage**: Secure storage for authentication tokens

### Flow Steps:

1. **(a)** Rapido App triggers login and requests token from Partner PWA
2. **(b)** Rapido App gets token for the user from Rapido Server
3. **(c)** Rapido Server creates and stores the token securely
4. **(d)** Partner PWA responds with the token to Rapido App
5. **(e)** Partner PWA uses the token to authenticate with Partner Server
6. **(f)** Partner Server validates token by requesting details from Rapido Server
7. **(g)** Rapido Server provides user details (name, phone number) to Partner Server


## Integration Components

### 1. Rapido JavaScript Bridge
The bridge provides secure communication between your PWA and the Rapido app:
- **Token Request**: Initiate user authentication flow
- **Session Management**: Store and retrieve session IDs securely
- **Event Handling**: Listen for authentication callbacks

### 2. User Consent Flow
Every integration respects user privacy through explicit consent:
- Users see exactly what data will be shared
- Consent is required for each new partner application

### 3. Server-to-Server Validation
Backend security through direct API communication:
- Tokens are validated against Rapido's secure endpoints
- User details are fetched server-side only
- Rate limiting and IP restrictions ensure API security

### 4. Session / Login Persistence
Secure session/cookie management across app launches:
- Encrypted session storage within Rapido's App(secure environment)
- Automatic session restoration on subsequent visits

## Security Architecture

### Multi-Layer Security
1. **Transport Security**: All communication over HTTPS/TLS
2. **Token Encryption**: Tokens are encrypted both in transit and at rest
3. **API Rate Limiting**: Prevents abuse and ensures system stability
4. **IP Whitelisting**: Additional layer for server-to-server communication

### Privacy Protection
- **Minimal Data Exposure**: Only necessary user data is shared
- **Explicit Consent**: Users control what information is accessible
- **Audit Trail**: All token requests and validations are logged

## Integration Flow Phases

### Phase 1: Initial Access
When a user first accesses your PWA through Rapido:
1. Rapido launches your PWA URL
2. Your PWA detects missing `sessionId` parameter
3. PWA triggers authentication flow via JavaScript Bridge

### Phase 2: User Authentication
The consent and token exchange process:
1. Rapido displays consent screen with your app details
2. User reviews and approves data sharing with partner PWA
3. Rapido generates encrypted authentication token
4. Token is passed to your PWA via `onTokenReceived` callback

### Phase 3: Backend Validation
Server-side token processing:
1. Your PWA sends token to your backend server
2. Backend calls Rapido's validation API with the token
3. Rapido returns user details and validation status
4. Your backend processes login/signup logic
5. Backend generates and returns `sessionId` to PWA

### Phase 4: Session Storage
Persistent session management:
1. PWA receives `sessionId` from backend
2. Calls `storeSessionId` to save in Rapido's secure storage (App)
3. Subsequent launches use `fetchSessionId` to retrieve session
4. Enables seamless re-authentication without user interaction


## Implementation Considerations

### PWA Requirements
- Must be hosted on HTTPS
- Responsive design for mobile-first experience
- Progressive Web App standards compliance
- JavaScript Bridge integration points

### Backend Requirements
- HTTPS endpoints for token validation
- IP whitelisting capabilities for enhanced security
- Error handling for authentication failures

### Testing Environment
- Sandbox environment available for integration testing
- Mock tokens and user data for development
- Comprehensive logging for debugging
- Staging environment that mirrors production behavior

---

**Next Steps**: Ready to start implementing? Head to our [Quick Start Guide](./quickstart.md) for step-by-step instructions, or dive into the [detailed integration flow](./integration/basics.md) for comprehensive implementation guidance.