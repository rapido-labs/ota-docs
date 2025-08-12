---
sidebar_position: 3
---
# Integration Flow

The diagram below explains the end-to-end interaction between the Rapido App, Partner PWA, Rapido Server, and Partner Server.
```
![Integration Flow](./pwa%20integration%20flow%20diagram.png)
```
### Flow Explanation

- **(a)** Rapido App launches the Partner PWA, triggering login.
- **(b)** Rapido App fetches a token for the user from Rapido Server.
- **(c)** Rapido Server creates and stores the token.
- **(d)** Rapido App passes the token to the Partner PWA.
- **(e)** Partner PWA logs in using the token.
- **(f)** Partner Server fetches user details from Rapido Server using the token.
- **(g)** Rapido Server responds with user name and number.
