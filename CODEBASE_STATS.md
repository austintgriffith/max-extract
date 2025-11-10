# Max Extract - Codebase Statistics

## Overview

Max Extract is a space-themed blockchain extraction game built on Ethereum. Players pilot ships through a dynamic universe, mining asteroids, engaging in combat, and competing for resources in a real-time multiplayer environment.

## Total Lines of Code: ~38,000

### By Language
- **Solidity**: 2,535 lines
- **TypeScript**: 29,004 lines
- **TypeScript React (TSX)**: 12,195 lines
- **JavaScript**: 1,055 lines

### By Component

#### Smart Contracts (1,986 lines)
Core on-chain game logic:
- `Game.sol` - 921 lines (main game mechanics)
- `MaxExtract.sol` - 512 lines (extraction/sector management)
- `Auditor.sol` - 271 lines (auditing system)
- `Universe.sol` - 199 lines (universe/sector state)
- `Credits.sol` - 83 lines (in-game currency)

*Plus 549 lines of deployment scripts and tests*

#### Backend/Game Server (18,252 lines)
Real-time game server built with TypeScript:
- WebSocket server for real-time multiplayer
- Simulation managers (combat, movement, spawning)
- AI ship behavior and targeting systems
- Blockchain integration and state management
- Route calculation and pathfinding
- Resource and refueling systems

#### Frontend (22,947 lines)
Next.js application with React:
- Real-time 3D sector visualization
- Ship controls and combat interface
- Dashboard and game statistics
- Blockchain wallet integration (RainbowKit)
- Custom hooks for contract interaction
- Scaffold-ETH 2 components and utilities

## Excluded from Count

The following auto-generated and third-party code is **not** included:
- `deployedContracts.ts` (6,820 lines) - Auto-generated contract ABIs
- `next-env.d.ts` and TypeScript definitions (21 lines)
- All libraries in `packages/foundry/lib/`:
  - OpenZeppelin contracts
  - Forge-std
  - solidity-bytes-utils
- Node modules and dependencies

## Tech Stack

### Smart Contracts
- Solidity ^0.8.20
- Foundry (compile, test, deploy)
- OpenZeppelin contracts

### Backend
- Node.js + TypeScript
- WebSocket (ws library)
- Ethers.js for blockchain interaction
- Custom game engine and physics

### Frontend
- Next.js 14 (App Router)
- React 18
- RainbowKit (wallet connection)
- Wagmi (Ethereum hooks)
- Scaffold-ETH 2 framework

## Development

Built using Scaffold-ETH 2 monorepo structure:
- `packages/foundry` - Smart contracts and deployment
- `packages/nextjs` - Frontend application
- `packages/scripts` - Game server and backend logic

All code architected and developed through AI-assisted development with Claude (Anthropic).

---

*Statistics generated: November 10, 2025*

