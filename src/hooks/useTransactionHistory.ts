"use client";

import { useState, useCallback, useEffect } from "react";

export type Transaction = {
  id: string;
  type: "swap" | "bridge" | "send";
  status: "success" | "error";
  timestamp: number;
  details: {
    amountIn?: string;
    tokenIn?: string;
    amountOut?: string;
    tokenOut?: string;
    fromChain?: string;
    toChain?: string;
    toAddress?: string;
  };
  message?: string;
};

const STORAGE_KEY = "arc_tx_history";
const MAX_HISTORY = 50;

function loadFromStorage(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(txs: Transaction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setTransactions(loadFromStorage());
  }, []);

  const addTransaction = useCallback((tx: Omit<Transaction, "id" | "timestamp">) => {
    const newTx: Transaction = {
      ...tx,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };

    setTransactions((prev) => {
      const updated = [newTx, ...prev].slice(0, MAX_HISTORY);
      saveToStorage(updated);
      return updated;
    });

    return newTx;
  }, []);

  const clearHistory = useCallback(() => {
    setTransactions([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { transactions, addTransaction, clearHistory };
}
