# Lumina DEX

Lumina is a decentralized exchange (DEX) interface built natively for the Arc Testnet. This project serves as a comprehensive demonstration of how to integrate the Arc ecosystem with Circle's Web3 services—specifically the Cross-Chain Transfer Protocol (CCTP) and App Kit—within a modern Next.js application.

The goal of this application is to provide a seamless reference implementation for developers building on Arc. It illustrates how to construct a fast, secure, and visually appealing Web3 trading interface from scratch.

## Features

- **Advanced Trading Interface**: Includes a responsive trade console built to simulate real-time token swaps and decentralized exchanges across the Arc ecosystem.
- **Wallet Connection Architecture**: Utilizes `@circle-fin/app-kit` and `@circle-fin/adapter-viem-v2` for robust and secure wallet interactions. It abstracts the complexity of wallet states and interactions away from the main UI.
- **Arc Testnet Integration**: Fully configured to communicate with the Arc Testnet environment.
- **Modern UI/UX**: Constructed using Tailwind CSS and Radix UI primitives. The application relies on a dark-themed aesthetic with ambient gradients, demonstrating how to build an immersive user experience without compromising on performance.

## Architecture and Stack

The application relies on the following core technologies:

- **Next.js 16 (App Router)**: Handles routing, rendering optimizations, and acts as the foundational framework.
- **React 19**: Used for constructing interactive user interfaces and managing state.
- **Viem**: Used as the underlying web3 library to interact with Ethereum-compatible blockchains, allowing for robust type-safe contract interactions.
- **Circle App Kit**: Provides out-of-the-box infrastructure for wallet management and CCTP logic.
- **Tailwind CSS v4**: Utility-first CSS framework for rapid and maintainable styling.

## Getting Started

### Prerequisites

You will need the following tools installed on your local machine before getting started:
- Node.js (version 20 or higher is recommended)
- A Circle App Kit Key to properly initialize the wallet connection and web3 provider services.

### Installation

1. Navigate to the project root directory:
   ```bash
   cd lumina
   ```

2. Install the necessary Node dependencies:
   ```bash
   npm install
   ```

### Configuration

You are required to set up specific environment variables to allow the integrations to work. Create a `.env` (or `.env.local`) file in the root directory. Add the required keys as follows:

```env
KIT_KEY="your_circle_kit_key_here"
```

Important: Do not commit your `.env` files to source control or share your private API keys publicly.

### Running the Development Server

Once the dependencies are installed and the environment variables are set, start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to visualize and interact with the Lumina DEX interface.

## Project Structure Overview

- `src/app`: Contains the Next.js application routes and main entry points.
- `src/components`: Houses reusable UI elements, including the `TradeConsole` and `WalletButton`.
- `src/providers`: Includes React Context providers (like the `WalletProvider`) that wrap the application to provide global web3 state.
- `src/hooks`: Custom React hooks to encapsulate application-specific logic.
