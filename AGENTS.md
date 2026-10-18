# Web3 Crowdfunding — project guide

## Purpose

This repository is a portfolio-quality educational Web3 crowdfunding application. It must be understandable, secure by design, well tested, and presentable to future employers or collaborators.

The user is learning by writing the code themselves. Explain concepts before implementation, give small focused steps, and provide examples only when requested or needed. Do not silently implement lesson code on the user's behalf.

## Architecture

This is a single repository with two applications:

- `contracts/`: Solidity smart contracts, Hardhat configuration, tests, deployment modules, and contract documentation.
- `frontend/`: a TypeScript React/Next.js application that reads contract state and asks a connected wallet to sign transactions.
- `docs/`: architecture decisions, security notes, diagrams, and other project documentation.

The blockchain is the source of truth for funds and campaign state. The frontend must never contain or handle a private key.

## Technology choices

- Smart-contract language: Solidity.
- Smart-contract development framework: Foundry (`forge`, `anvil`, and `cast`).
- Frontend: Next.js, TypeScript, wagmi, and viem.
- Initial network: local Hardhat network; later, an Ethereum testnet.

Use Remix IDE only as a temporary learning sandbox for early Solidity exercises. All project code belongs in this repository and must be committed to Git.

## Git workflow

- `main` contains stable, reviewed, working code only.
- Create one short-lived feature branch per meaningful unit of work, for example `feature/campaign-contract` or `feature/wallet-connection`.
- Start new work from an up-to-date `main` branch.
- Keep commits small and logically focused. Use Conventional Commit-style messages, such as `feat: add campaign creation` or `test: cover donation validation`.
- Run the relevant formatter, compiler, and tests before committing.
- Never commit secrets, `.env` files, private keys, RPC credentials, generated artifacts, caches, or dependencies.

## Smart-contract standards

- Prefer clear, explicit code over clever code.
- Validate inputs and enforce access control.
- Use checks-effects-interactions for external transfers.
- Treat external calls as untrusted and consider reentrancy before implementing money movement.
- Write tests for successful flows, access restrictions, invalid input, boundary conditions, and failure cases.
- Record security-sensitive design decisions in `docs/`.

## Required quality bar

Each finished feature should include appropriate tests, documentation updates when behavior or architecture changes, and a clean Git status.
