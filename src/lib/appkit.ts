import { AppKit, Blockchain, BridgeChain, SwapChain } from "@circle-fin/app-kit";
import { ArcTestnet, BaseSepolia, EthereumSepolia } from "@circle-fin/app-kit/chains";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";

export type Operation = "chains" | "send-estimate" | "send" | "bridge-estimate" | "bridge" | "swap-estimate" | "swap";

export type OperationInput = {
  operation: Operation;
  chain?: string;
  from?: string;
  toChain?: string;
  to?: string;
  amount?: string;
  token?: string;
  tokenIn?: string;
  tokenOut?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in environment`);
  return value;
}

function normalize(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, normalize(child)]),
    );
  }
  return value;
}

function resolveSendChain(identifier: string): Blockchain {
  const chains: Record<string, Blockchain> = {
    Arc_Testnet: Blockchain.Arc_Testnet,
    Base_Sepolia: Blockchain.Base_Sepolia,
    Ethereum_Sepolia: Blockchain.Ethereum_Sepolia,
  };
  return chains[identifier] ?? Blockchain.Arc_Testnet;
}

function resolveBridgeChain(identifier: string): BridgeChain {
  const chains: Record<string, BridgeChain> = {
    Arc_Testnet: BridgeChain.Arc_Testnet,
    Base_Sepolia: BridgeChain.Base_Sepolia,
    Ethereum_Sepolia: BridgeChain.Ethereum_Sepolia,
  };
  return chains[identifier] ?? BridgeChain.Arc_Testnet;
}

function resolveSwapChain(identifier: string): SwapChain {
  const chains: Record<string, SwapChain> = {
    Arc_Testnet: SwapChain.Arc_Testnet,
  };
  return chains[identifier] ?? SwapChain.Arc_Testnet;
}

function buildAdapter() {
  return createViemAdapterFromPrivateKey({
    privateKey: requireEnv("PRIVATE_KEY"),
    capabilities: {
      addressContext: "user-controlled",
      supportedChains: [ArcTestnet, BaseSepolia, EthereumSepolia],
    },
  });
}

export async function runOperation(input: OperationInput) {
  const kit = new AppKit();

  if (input.operation === "chains") {
    return normalize(
      kit.getSupportedChains().map((chain) => ({
        name: chain.name,
        chain: chain.chain,
        type: chain.type,
        isTestnet: chain.isTestnet,
      })),
    );
  }

  const adapter = buildAdapter();
  const amount = input.amount || "1.00";

  if (input.operation === "send-estimate") {
    return normalize(
      await kit.estimateSend({
        from: { adapter, chain: resolveSendChain(input.chain || "Arc_Testnet") },
        to: input.to || process.env.RECIPIENT_ADDRESS || "",
        amount,
        token: input.token || "USDC",
      }),
    );
  }

  if (input.operation === "send") {
    return normalize(
      await kit.send({
        from: { adapter, chain: resolveSendChain(input.chain || "Arc_Testnet") },
        to: input.to || process.env.RECIPIENT_ADDRESS || "",
        amount,
        token: input.token || "USDC",
      }),
    );
  }

  if (input.operation === "bridge-estimate") {
    return normalize(
      await kit.estimateBridge({
        from: { adapter, chain: resolveBridgeChain(input.from || "Arc_Testnet") },
        to: { adapter, chain: resolveBridgeChain(input.toChain || "Base_Sepolia") },
        amount,
      }),
    );
  }

  if (input.operation === "bridge") {
    return normalize(
      await kit.bridge({
        from: { adapter, chain: resolveBridgeChain(input.from || "Arc_Testnet") },
        to: { adapter, chain: resolveBridgeChain(input.toChain || "Base_Sepolia") },
        amount,
      }),
    );
  }

  if (input.operation === "swap-estimate") {
    return normalize(
      await kit.estimateSwap({
        from: { adapter, chain: resolveSwapChain(input.chain || "Arc_Testnet") },
        tokenIn: input.tokenIn || "USDC",
        tokenOut: input.tokenOut || "EURC",
        amountIn: amount,
        config: { kitKey: requireEnv("KIT_KEY") },
      }),
    );
  }

  if (input.operation === "swap") {
    return normalize(
      await kit.swap({
        from: { adapter, chain: resolveSwapChain(input.chain || "Arc_Testnet") },
        tokenIn: input.tokenIn || "USDC",
        tokenOut: input.tokenOut || "EURC",
        amountIn: amount,
        config: { kitKey: requireEnv("KIT_KEY") },
      }),
    );
  }

  throw new Error(`Unsupported operation: ${input.operation}`);
}
