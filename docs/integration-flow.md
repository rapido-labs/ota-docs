---
sidebar_position: 3
---
# Integration Flow

The diagram below explains the end-to-end interaction between the Rapido App, Partner PWA, Rapido Server, and Partner Server.

![Integration Flow](/img/rapido-pwa-integration-flow.png)
### Flow Explanation

- **(a)** Rapido App launches the Partner PWA, triggering login.
- **(b)** Rapido App fetches a token for the user from Rapido Server.
- **(c)** Rapido Server creates and stores the token.
- **(d)** Rapido App passes the token to the Partner PWA.
- **(e)** Partner PWA logs in using the token.
- **(f)** Partner Server fetches user details from Rapido Server using the token.
- **(g)** Rapido Server responds with user name and number.

## Complete Integration Flow with Session Management

The integration includes a comprehensive session management system that enables seamless user experience across app launches:

### Phase 1: Initial Authentication Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Rapido App │    │ Partner PWA │    │Partner Server│    │Rapido Server│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       │ 1. Launch PWA    │                  │                  │
       │─────────────────▶│                  │                  │
       │                  │ 2. Check stored  │                  │
       │                  │   session ID     │                  │
       │                  │ (requestSessionId)│                  │
       │◀─────────────────│                  │                  │
       │ 3. No session    │                  │                  │
       │   found (null)   │                  │                  │
       │─────────────────▶│                  │                  │
       │                  │ 4. Request auth  │                  │
       │                  │   token          │                  │
       │◀─────────────────│ (requestUserToken)                 │
       │ 5. Fetch token   │                  │                  │
       │─────────────────────────────────────────────────────▶│
       │                  │                  │ 6. Token created │
       │◀─────────────────────────────────────────────────────│
       │ 7. Pass token    │                  │                  │
       │─────────────────▶│                  │                  │
       │                  │ 8. Validate token│                  │
       │                  │─────────────────▶│                  │
       │                  │                  │ 9. API validation│
       │                  │                  │─────────────────▶│
       │                  │                  │10. User details  │
       │                  │                  │◀─────────────────│
       │                  │11. Auth success  │                  │
       │                  │◀─────────────────│                  │
       │                  │12. Store session │                  │
       │                  │   ID securely    │                  │
       │◀─────────────────│ (storeSessionId) │                  │
       │13. Update login  │                  │                  │
       │   status         │                  │                  │
       │◀─────────────────│                  │                  │
```

### Phase 2: Subsequent App Launch (With Stored Session)
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Rapido App │    │ Partner PWA │    │Partner Server│
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       │ 1. Launch PWA    │                  │
       │─────────────────▶│                  │
       │                  │ 2. Check stored  │
       │                  │   session ID     │
       │                  │ (requestSessionId)│
       │◀─────────────────│                  │
       │ 3. Return stored │                  │
       │   session ID     │                  │
       │─────────────────▶│                  │
       │                  │ 4. Validate      │
       │                  │   session        │
       │                  │─────────────────▶│
       │                  │ 5. Session valid │
       │                  │◀─────────────────│
       │                  │ 6. Direct to     │
       │                  │   dashboard      │
       │                  │   (no login)     │
```

### Phase 3: Session Expiration Handling
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Rapido App │    │ Partner PWA │    │Partner Server│
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       │ 1. Launch PWA    │                  │
       │─────────────────▶│                  │
       │                  │ 2. Check stored  │
       │                  │   session ID     │
       │                  │ (requestSessionId)│
       │◀─────────────────│                  │
       │ 3. Return stored │                  │
       │   session ID     │                  │
       │─────────────────▶│                  │
       │                  │ 4. Validate      │
       │                  │   session        │
       │                  │─────────────────▶│
       │                  │ 5. Session       │
       │                  │   INVALID/EXPIRED│
       │                  │◀─────────────────│
       │                  │ 6. Clear stored  │
       │                  │   session        │
       │◀─────────────────│ (clearUserToken) │
       │                  │ 7. Restart auth  │
       │                  │   flow           │
       │                  │ (requestUserToken)│
       │◀─────────────────│                  │
       │     ... (Continue with Phase 1) ... │
```

## Key Integration Points

### JavaScript Bridge Methods Used

1. **`requestSessionId()`** - Request stored session ID from secure storage
   - Callback: `onSessionIdReceived(sessionId)`
   - Used on app launch to check for existing sessions

2. **`requestUserToken(metadata)`** - Request user authentication token  
   - Callback: `onTokenReceived(token)`
   - Used when no valid session exists

3. **`storeSessionId(sessionId)`** - Store session ID securely
   - Returns: `'SUCCESS'` or error
   - Used after successful authentication

4. **`clearUserToken()`** - Clear stored credentials
   - Used for logout or session cleanup

5. **`updateLoginStatus(success, error)`** - Notify app of login result
   - Used to inform Rapido app of authentication outcome

6. **`logEvents(eventType, propertiesJson)`** - Track user interactions and analytics
   - Used for real-time event tracking (see [Events Tracking](./integration/events-tracking.md) for complete guide)

### Security Features

- **Encrypted Storage**: Session IDs stored in Rapido's secure keystore, not browser storage
- **Token Expiration**: Authentication tokens have limited lifespan (15 minutes)
- **Session Validation**: Server-side session validation with expiration checking
- **Automatic Cleanup**: Expired sessions automatically removed from storage

### Error Handling Flow

```
Authentication Error ─┐
Session Expired ──────┤──▶ Clear Session ──▶ Restart Auth Flow
Validation Failed ────┘
```

This comprehensive flow ensures users have a seamless experience with automatic session management while maintaining enterprise-grade security standards.
