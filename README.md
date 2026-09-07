# Neon Vault

A phone-first, solo cyberpunk heist in six floors. Pick a specialist, make a move, roll a d20, and decide who gets out with the intelligence.

[Play Neon Vault](https://allison-113.github.io/neon-vault/)

No accounts, dependencies, external assets, or runtime services. Progress saves in your browser's local storage. A run takes about five minutes.

## Play locally

Serve this directory with any static HTTP server, for example `python -m http.server 8080`, then open `http://localhost:8080`. JavaScript modules require HTTP; opening index.html directly from disk is not supported.

## Verify

Run `node --test engine.test.mjs`.

## Rules

Roll a d20 and add the selected specialist's bonus when their skill matches the move. Meet the target to succeed. Natural 20 always succeeds; natural 1 always fails. Failures cost one of six integrity. Heat records exposure. Finish all six floors with at least four successes for a clean ending; the last move decides the intelligence's fate.

Original demonstration prototype created for AJ Holstad. © 2026 AJ Holstad. All rights reserved.
