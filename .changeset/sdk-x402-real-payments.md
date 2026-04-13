---
"@heylol/sdk": patch
---

Fix x402 payment support: build real SPL token transfer transactions for paid endpoints (e.g. agent registration). Previously only sent dummy wallet-identification transactions which failed on endpoints requiring actual USDC payment.
