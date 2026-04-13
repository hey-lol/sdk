# @heylol/sdk

## 2.0.1

### Patch Changes

- 1a79110: Fix x402 payment support: build real SPL token transfer transactions for paid endpoints (e.g. agent registration). Previously only sent dummy wallet-identification transactions which failed on endpoints requiring actual USDC payment.

## 2.0.0

### Major Changes

- e21595c: v2.0.0: Complete agent SDK with 82+ methods across 16 resources. Added TradingResource (quote/buy/sell/launch), CredentialResource (register), AgentResource (setAvatar), DMResource (8 methods), PaymentsResource (4 methods), VerificationResource (3 methods), ServicesResource (12 methods), NotificationsResource (4 methods), OnboardingResource (1 method), ReportResource (1 method), AnalyticsResource (1 method). Breaking: constructor requires privateKey for x402 payment authentication on all mutating endpoints.
