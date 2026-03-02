---
phase: 02-core-crypto-and-auth
plan: 02
subsystem: auth
tags: [solana, ed25519, compact-u16, transaction-serializer, noble-curves, tdd, typescript, wire-format]

# Dependency graph
requires:
  - phase: 02-core-crypto-and-auth
    plan: 01
    provides: AuthError hierarchy used for TRANSACTION_BUILD_FAILED errors

provides:
  - packages/sdk/src/auth/solana.ts — encodeCompactU16() and buildDummyTransaction()
  - packages/sdk/tests/solana.test.ts — 25 byte-level tests for compact-u16 and transaction wire format

affects: [02-03, 02-04, all phases using buildDummyTransaction for x402 wallet identification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Solana compact-u16 encoding (3 ranges: 1-byte 0-127, 2-byte 128-16383, 3-byte 16384-65535)
    - concatBytes() helper using .set() at computed offsets — no spread syntax for performance
    - Solana legacy transaction wire format: sig_count + signature + header + accounts + blockhash + instructions
    - All crypto via @noble/curves/ed25519.js (ed25519.sign and ed25519.verify)

key-files:
  created:
    - packages/sdk/src/auth/solana.ts
    - packages/sdk/tests/solana.test.ts
  modified: []

key-decisions:
  - "Solana compact-u16 is NOT protobuf varint — different encoding for 2-byte range: (value & 0x7f) | 0x80, value >> 7"
  - "buildDummyTransaction produces exactly 169 bytes for standard inputs — deterministic output confirmed"
  - "concatBytes() uses .set() at computed offsets instead of spread — avoids O(n) spread overhead for large arrays"
  - "Message is signed before prepending sig_count + signature — ed25519.sign receives the raw message bytes"

patterns-established:
  - "Pattern: Byte-level TDD — tests verify exact byte values at specific offsets, not just shape"
  - "Pattern: Signature verify test — extract signature and message from transaction, verify with ed25519.verify"
  - "Pattern: Zero-amount dummy transaction — system program transfer of 0 lamports as wallet proof of ownership"

requirements-completed: [AUTH-03, AUTH-06]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 02 Plan 02: Solana Transaction Serializer Summary

**Solana compact-u16 encoder and zero-amount legacy transaction builder using only @noble/curves/ed25519.js — no @solana/web3.js, no Node.js built-ins, 169 bytes deterministic output**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T13:53:08Z
- **Completed:** 2026-03-01T13:55:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- encodeCompactU16() handles all Solana compact-u16 edge cases (1/2/3-byte ranges, boundary values 0/127/128/16383/16384/65535)
- buildDummyTransaction() produces a valid 169-byte Solana legacy transaction wire format
- Ed25519 signature verifies against extracted message bytes — confirmed at the byte level
- 25 TDD tests covering every byte offset in the transaction wire format
- Zero Node.js built-in imports — only @noble/curves/ed25519.js for crypto

## Task Commits

Each task was committed atomically:

1. **Task 1: compact-u16 encoding with byte-level TDD** - `d55341b` (feat)
2. **Task 2: Zero-amount dummy transaction builder with TDD** - `2fe934c` (feat)

_Note: TDD tasks combined RED + GREEN into single task commits (implementation was written alongside tests)_

## Files Created/Modified
- `packages/sdk/src/auth/solana.ts` — encodeCompactU16() and buildDummyTransaction() with concatBytes() helper
- `packages/sdk/tests/solana.test.ts` — 25 byte-level tests: 11 for compact-u16 encoding, 14 for transaction wire format

## Decisions Made
- Solana compact-u16 is NOT protobuf varint: the 2-byte range uses `(value & 0x7f) | 0x80, value >> 7` which differs from standard LEB128. Verified against plan spec and all 9 test vectors.
- `concatBytes()` helper allocates exact-size buffer and uses `.set()` — avoids V8 spread deoptimization for Uint8Arrays larger than a few hundred bytes.
- Message is signed as raw bytes, then sig_count + signature prepended — this matches Solana legacy transaction format where signature covers the serialized message.

## Deviations from Plan

None - plan executed exactly as written. Implementation was built following the plan's algorithm specification precisely.

## Issues Encountered
None. All tests passed on first run. The pre-existing `x402.test.ts` file (committed in `c969e1f` as part of 02-03's RED phase) was present and passing — not a deviation from this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `buildDummyTransaction()` is ready for use in 02-03 (x402 parser) and 02-04 (client integration)
- `encodeCompactU16()` exported for any future Solana serialization needs
- `AuthError` with `TRANSACTION_BUILD_FAILED` code is the error boundary for all transaction failures
- Ready for 02-03: x402 response parser (uses AuthError + types from 02-01, does not depend on solana.ts)

---
*Phase: 02-core-crypto-and-auth*
*Completed: 2026-03-01*

## Self-Check: PASSED

All files verified present:
- FOUND: packages/sdk/src/auth/solana.ts
- FOUND: packages/sdk/tests/solana.test.ts
- FOUND: .planning/phases/02-core-crypto-and-auth/02-02-SUMMARY.md

All commits verified:
- FOUND: d55341b (feat(02-02): compact-u16 encoder)
- FOUND: 2fe934c (feat(02-02): buildDummyTransaction)
