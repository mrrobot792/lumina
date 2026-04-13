"use client";

import { useState, useEffect, useCallback } from "react";

// ERC-20 balanceOf selector: keccak256("balanceOf(address)") first 4 bytes
const BALANCE_OF_SELECTOR = "0x70a08231";

// ─── Per-chain native token config ───
// Arc Testnet uses USDC as native gas token (18 decimals on-chain)
const NATIVE_TOKEN: Record<number, { symbol: string; name: string; decimals: number; color: string; icon: string }> = {
  5042002: { symbol: "USDC", name: "USD Coin", decimals: 18, color: "transparent", icon: "/tokens/usdc.png" },
};

const DEFAULT_NATIVE = { symbol: "ETH", name: "Ethereum", decimals: 18, color: "transparent", icon: "/tokens/eth.png" };

function getNativeToken(chainId: number) {
  return NATIVE_TOKEN[chainId] ?? DEFAULT_NATIVE;
}

// ─── ERC-20 token contracts per chainId ───
const TOKEN_CONTRACTS: Record<number, { symbol: string; name: string; address: string; decimals: number; color: string; icon: string }[]> = {
  // Arc Testnet — USDC is native, EURC is ERC-20
  5042002: [
    { symbol: "EURC", name: "Euro Coin", address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6, color: "transparent", icon: "/tokens/eurc.png" },
  ],
  // Ethereum Sepolia
  11155111: [
    { symbol: "USDC", name: "USD Coin", address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", decimals: 6, color: "transparent", icon: "/tokens/usdc.png" },
  ],
  // Base Sepolia
  84532: [
    { symbol: "USDC", name: "USD Coin", address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", decimals: 6, color: "transparent", icon: "/tokens/usdc.png" },
  ],
};

export type TokenBalance = {
  symbol: string;
  name: string;
  balance: string; // formatted with decimals
  rawBalance: bigint;
  usd: string;
  color: string;
  icon: string;
  isNative: boolean;
};

function formatBalance(raw: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const intPart = raw / divisor;
  const fracPart = raw % divisor;
  const fracStr = fracPart.toString().padStart(decimals, "0");
  // Show up to 6 significant decimal digits, trim trailing zeros
  const trimmed = fracStr.slice(0, 6).replace(/0+$/, "") || "0";
  if (intPart === BigInt(0) && trimmed === "0") return "0";
  if (trimmed === "0") return intPart.toLocaleString("en-US");
  return `${intPart.toLocaleString("en-US")}.${trimmed}`;
}

function padAddress(address: string): string {
  // Remove 0x, pad to 32 bytes
  return address.toLowerCase().replace("0x", "").padStart(64, "0");
}

export function useBalances(address: string | null, chainId: number | null) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalUsd, setTotalUsd] = useState("$0.00");

  const fetchBalances = useCallback(async () => {
    if (!address || !chainId || typeof window === "undefined" || !window.ethereum) {
      setBalances([]);
      setTotalUsd("$0.00");
      return;
    }

    // Verify the wallet is still connected before making RPC calls
    try {
      const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
      if (accounts.length === 0) {
        setBalances([]);
        setTotalUsd("$0.00");
        return;
      }
    } catch {
      // Provider not ready yet (common during page refresh)
      return;
    }

    setIsLoading(true);

    try {
      const results: TokenBalance[] = [];
      const native = getNativeToken(chainId);

      // 1. Fetch native balance (ETH on most chains, USDC on Arc)
      let nativeRaw = BigInt(0);
      let nativeFormatted = "0";
      try {
        const nativeHex = (await window.ethereum!.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        })) as string;
        nativeRaw = BigInt(nativeHex);
        nativeFormatted = formatBalance(nativeRaw, native.decimals);
      } catch {
        // RPC may not be available for this chain
      }

      results.push({
        symbol: native.symbol,
        name: native.name,
        balance: nativeFormatted,
        rawBalance: nativeRaw,
        usd: "",
        color: native.color,
        icon: native.icon,
        isNative: true,
      });

      // 2. Fetch ERC-20 token balances
      const tokens = TOKEN_CONTRACTS[chainId] ?? [];
      for (const token of tokens) {
        try {
          const data = BALANCE_OF_SELECTOR + padAddress(address);
          const balanceHex = (await window.ethereum!.request({
            method: "eth_call",
            params: [
              {
                to: token.address,
                data,
              },
              "latest",
            ],
          })) as string;

          const tokenRaw = BigInt(balanceHex);
          const tokenFormatted = formatBalance(tokenRaw, token.decimals);

          results.push({
            symbol: token.symbol,
            name: token.name,
            balance: tokenFormatted,
            rawBalance: tokenRaw,
            usd: "",
            color: token.color,
            icon: token.icon,
            isNative: false,
          });
        } catch {
          // Token may not exist on this chain, skip
          results.push({
            symbol: token.symbol,
            name: token.name,
            balance: "0",
            rawBalance: BigInt(0),
            usd: "",
            color: token.color,
            icon: token.icon,
            isNative: false,
          });
        }
      }

      setBalances(results);

      // Calculate total: native USDC + any ERC-20 USDC balances + EURC equivalent
      let totalVal = 0;
      for (const r of results) {
        const amount = parseFloat(r.balance.replace(/,/g, "")) || 0;
        if (r.symbol === "USDC") {
          totalVal += amount;
        } else if (r.symbol === "EURC") {
          // Approximate conversion: 1 EURC ≈ 1.0833 USDC
          totalVal += amount * 1.0833;
        }
      }
      setTotalUsd(`$${totalVal.toFixed(2)}`);
    } catch (err: unknown) {
      // Extract meaningful message from RPC errors (often plain objects, not Error instances)
      let message: string;
      if (err instanceof Error) {
        message = err.message;
      } else if (err && typeof err === "object" && "message" in err) {
        message = String((err as { message: unknown }).message);
      } else {
        message = JSON.stringify(err);
      }
      if (!message.includes("disconnected") && !message.includes("User denied") && !message.includes("too many errors")) {
        console.warn("[useBalances] RPC error:", message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    fetchBalances();

    // Refresh every 30 seconds (avoid RPC rate limits)
    const interval = setInterval(fetchBalances, 30_000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return { balances, isLoading, totalUsd, refetch: fetchBalances };
}
