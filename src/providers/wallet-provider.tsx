"use client";

import { createContext, useContext, ReactNode } from "react";
import { useWallet, WalletState, WalletType } from "@/hooks/useWallet";

type WalletContextValue = WalletState & {
  connect: (walletType?: WalletType, targetChainId?: number) => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string>;
  switchChain: (targetChainId: number) => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  return (
    <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be used within WalletProvider");
  return ctx;
}
