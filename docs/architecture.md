# Architecture

The project is split into two independent applications:

1. `contracts/` contains the on-chain rules and is the source of truth for campaign funds and state.
2. `frontend/` reads contract data and asks the user's wallet to sign transactions.

The frontend never receives or stores users' private keys.
