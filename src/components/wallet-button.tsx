"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useWalletContext } from "@/providers/wallet-provider";
import { WalletType } from "@/hooks/useWallet";
import { useBalances } from "@/hooks/useBalances";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import {
  XMarkIcon,
  ArrowRightStartOnRectangleIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

/* ─── Constants ─── */
const CHAIN_MAP: Record<number, { name: string; color: string; abbr: string }> = {
  1:     { name: "Ethereum",       color: "#627EEA", abbr: "ETH" },
  11155111: { name: "Sepolia",     color: "#627EEA", abbr: "SEP" },
  56:    { name: "BNB Chain",      color: "#F0B90B", abbr: "BNB" },
  137:   { name: "Polygon",        color: "#8247E5", abbr: "POL" },
  42161: { name: "Arbitrum",       color: "#28A0F0", abbr: "ARB" },
  10:    { name: "Optimism",       color: "#FF0420", abbr: "OP"  },
  8453:  { name: "Base",           color: "#0052FF", abbr: "BASE" },
  84532: { name: "Base Sepolia",   color: "#0052FF", abbr: "BSEP" },
  5042002: { name: "Arc Testnet",  color: "#38BDF8", abbr: "ARC" },
};

function getChainInfo(chainId: number | null) {
  if (!chainId) return { name: "Unknown", color: "#6B7280", abbr: "?" };
  return CHAIN_MAP[chainId] ?? { name: `Chain ${chainId}`, color: "#6B7280", abbr: `${chainId}` };
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}



/* ═══════════════════════════════════════════════
   Connect Modal — full-screen overlay
   ═══════════════════════════════════════════════ */
function ConnectModal({ onClose, onConnect, isConnecting }: {
  onClose: () => void;
  onConnect: (type: WalletType) => void;
  isConnecting: boolean;
}) {
  const [detected, setDetected] = useState({ metamask: false, coinbase: false, rabby: false, okx: false });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const eth = window.ethereum;
      const sysOkx = !!window.okxwallet;
      
      if (!eth && !sysOkx) return;

      if (eth?.providers && Array.isArray(eth.providers)) {
        setDetected({
          metamask: !!eth.providers.find((p: any) => p.isMetaMask && !p.isRabby && !p.isOkxWallet),
          coinbase: !!eth.providers.find((p: any) => p.isCoinbaseWallet),
          rabby: !!eth.providers.find((p: any) => p.isRabby),
          okx: sysOkx || !!eth.providers.find((p: any) => p.isOkxWallet),
        });
      } else {
        setDetected({
          metamask: !!eth?.isMetaMask && !eth?.isRabby && !eth?.isOkxWallet,
          coinbase: !!eth?.isCoinbaseWallet,
          rabby: !!eth?.isRabby,
          okx: sysOkx || !!eth?.isOkxWallet,
        });
      }
    }
  }, []);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-[400px] mx-4 animate-modal-in">
        <div className="rounded-[24px] border border-white/[0.08] bg-[#12131a]/95 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden relative">
          
          {/* Subtle top glow */}
          <div className="absolute top-0 inset-x-0 h-[100px] bg-gradient-to-b from-sky-500/10 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2 relative z-10">
            <h2 className="text-xl font-bold text-white tracking-tight">Connect Wallet</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
            >
              <XMarkIcon className="size-5" />
            </button>
          </div>

          {/* Subtitle */}
          <p className="px-6 pb-5 text-sm text-white/35">
            Connect your wallet to start trading on Lumina
          </p>

          {/* Wallet Options */}
          <div className="px-5 pb-6 space-y-2">
            {!detected.metamask && !detected.okx && !detected.rabby && !detected.coinbase && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-white/[0.04] p-3 mb-3">
                  <svg className="size-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-white mb-1">No Wallets Detected</p>
                <p className="text-xs text-white/40">Install a Web3 wallet extension to continue.</p>
              </div>
            )}

            {/* MetaMask */}
            {detected.metamask && (
            <button
              onClick={() => onConnect("metamask")}
              disabled={isConnecting || !detected.metamask}
              className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3.5 transition-all hover:bg-white/[0.06] hover:border-white/[0.1] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none disabled:active:scale-100"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 shadow-inner transition-transform group-hover:scale-105">
                <img src="/wallets/metamask.svg" alt="MetaMask" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">MetaMask</div>
                <div className="text-xs text-white/30">Browser extension</div>
              </div>
              {isConnecting ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" />
              ) : (
                <div className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Connect
                </div>
              )}
            </button>
            )}

            {/* OKX Wallet */}
            {detected.okx && (
            <button
              onClick={() => onConnect("okx")}
              disabled={isConnecting || !detected.okx}
              className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3.5 transition-all hover:bg-white/[0.06] hover:border-white/[0.1] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none disabled:active:scale-100"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 shadow-inner transition-transform group-hover:scale-105">
                <img src="/wallets/okx.svg" alt="OKX Wallet" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">OKX Wallet</div>
                <div className="text-xs text-white/30">Browser extension</div>
              </div>
              {isConnecting ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" />
              ) : (
                <div className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Connect
                </div>
              )}
            </button>
            )}

            {/* Rabby Wallet */}
            {detected.rabby && (
            <button
              onClick={() => onConnect("rabby")}
              disabled={isConnecting || !detected.rabby}
              className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3.5 transition-all hover:bg-white/[0.06] hover:border-white/[0.1] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none disabled:active:scale-100"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7A7CFF]/10 border border-[#7A7CFF]/20 p-2.5 text-[#7A7CFF] transition-transform group-hover:scale-105">
                <img src="/wallets/rabby.svg" alt="Rabby Wallet" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">Rabby Wallet</div>
                <div className="text-xs text-white/30">Browser extension</div>
              </div>
              {isConnecting ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" />
              ) : (
                <div className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Connect
                </div>
              )}
            </button>
            )}

            {/* Coinbase Wallet */}
            {detected.coinbase && (
            <button
              onClick={() => onConnect("coinbase")}
              disabled={isConnecting || !detected.coinbase}
              className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3.5 transition-all hover:bg-white/[0.06] hover:border-white/[0.1] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none disabled:active:scale-100"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0052FF]/10 border border-[#0052FF]/20 p-2.5 text-[#0052FF] transition-transform group-hover:scale-105">
                <img src="/wallets/coinbase.png" alt="Coinbase Wallet" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">Coinbase Wallet</div>
                <div className="text-xs text-white/30">Mobile & extension</div>
              </div>
              {isConnecting ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" />
              ) : (
                <div className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Connect
                </div>
              )}
            </button>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-4">
            <p className="text-center text-[11px] text-white/20 leading-relaxed">
              By connecting, you agree to Lumina&apos;s Terms of Service and acknowledge that you have read the Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Wallet Panel — Slide-down dropdown
   ═══════════════════════════════════════════════ */
function WalletPanel({
  address,
  chainId,
  onDisconnect,
  onClose,
}: {
  address: string;
  chainId: number | null;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"assets" | "activity">("assets");
  const panelRef = useRef<HTMLDivElement>(null);

  const chainInfo = getChainInfo(chainId);
  const { balances, isLoading, totalUsd, refetch } = useBalances(address, chainId);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="fixed right-4 top-[60px] w-[380px] animate-panel-in origin-top-right z-[90]"
    >
      <div className="rounded-3xl border border-white/[0.08] bg-[#141520]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-white">My Wallet</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={refetch}
              className={`rounded-full p-1.5 text-white/25 hover:text-white/50 hover:bg-white/[0.06] transition-colors ${isLoading ? "animate-spin" : ""}`}
            >
              <ArrowPathIcon className="size-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-white/25 hover:text-white/50 hover:bg-white/[0.06] transition-colors"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Address card */}
        <div className="mx-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Jazzicon-like avatar */}
              <div className="relative">
                <div
                  className="h-10 w-10 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${chainInfo.color}, #8B5CF6, #EC4899)`,
                  }}
                />
                <div
                  className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[#141520] flex items-center justify-center text-[6px] font-bold text-white"
                  style={{ background: chainInfo.color }}
                >
                  {chainInfo.abbr.slice(0, 2)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white font-mono">
                    {shortenAddress(address)}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-white/20 hover:text-white/50 transition-colors"
                  >
                    {copied ? (
                      <CheckIcon className="size-3.5 text-emerald-400" />
                    ) : (
                      <DocumentDuplicateIcon className="size-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: chainInfo.color }}
                  />
                  <span className="text-xs text-white/35">{chainInfo.name}</span>
                  <span className="text-xs text-white/15">·</span>
                  <span className="text-xs text-white/35">EVM</span>
                </div>
              </div>
            </div>
            <button
              onClick={onDisconnect}
              className="rounded-xl p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Disconnect"
            >
              <ArrowRightStartOnRectangleIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Total Balance */}
        <div className="px-5 pt-4 pb-2">
          <div className="text-xs text-white/30 font-medium mb-1">Total Balance</div>
          <div className="text-2xl font-bold text-white tracking-tight">{totalUsd}</div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 px-5 border-b border-white/[0.04]">
          {(["assets", "activity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab ? "text-white" : "text-white/30 hover:text-white/50"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-sky-400" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[320px] overflow-y-auto wallet-scrollbar">
          {activeTab === "assets" ? (
            <div className="px-3 py-2 space-y-0.5">
              {isLoading && balances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-white/20">
                  <ArrowPathIcon className="size-6 animate-spin mb-2" />
                  <span className="text-xs">Loading balances...</span>
                </div>
              ) : balances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-white/20">
                  <span className="text-xs">No assets found</span>
                </div>
              ) : (
                balances.map((asset, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shrink-0 overflow-hidden"
                        style={{ background: asset.color }}
                      >
                        {asset.icon.startsWith('/') ? (
                          <img src={asset.icon} alt={asset.symbol} className="w-full h-full object-cover" />
                        ) : (
                          asset.icon
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{asset.symbol}</div>
                        <div className="text-xs text-white/25">{chainInfo.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-white tabular-nums">{asset.balance}</div>
                      {asset.usd && <div className="text-xs text-white/25 tabular-nums">{asset.usd}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <ActivityList />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main WalletButton — exported component
   ═══════════════════════════════════════════════ */
export function WalletButton() {
  const { isConnected, address, chainId, isConnecting, isInitializing, connect, disconnect } = useWalletContext();
  const [showModal, setShowModal] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [mounted, setMounted] = useState(false);

  const chainInfo = getChainInfo(chainId);

  // Hydration guard — prevents SSR/client mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async (type: WalletType) => {
    try {
      await connect(type, 5042002);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowPanel(false);
  };

  // ─── Pre-mount: stable placeholder (SSR-safe) ───
  if (!mounted) {
    return (
      <div className="h-10 w-[158px] rounded-2xl bg-white/[0.04]" />
    );
  }

  // ─── Initializing: skeleton with same dimensions as connect button ───
  if (isInitializing) {
    return (
      <div className="h-10 w-[158px] rounded-2xl bg-white/[0.04] animate-pulse" />
    );
  }

  // ─── Disconnected State ───
  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="group relative h-10 rounded-2xl px-5 text-sm font-semibold text-white transition-all active:scale-95 overflow-hidden animate-fade-in"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-blue-500 to-violet-500 opacity-90 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-400 via-blue-400 to-violet-400 opacity-0 group-hover:opacity-50 blur-xl transition-opacity" />
          <span className="relative flex items-center gap-2">
            <WalletIcon />
            Connect Wallet
          </span>
        </button>

        {showModal && createPortal(
          <ConnectModal
            onClose={() => setShowModal(false)}
            onConnect={async (type) => {
              await handleConnect(type);
              setShowModal(false);
            }}
            isConnecting={isConnecting}
          />,
          document.body
        )}
      </>
    );
  }

  // ─── Connected State ───
  return (
    <div className="relative animate-fade-in">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.04] pl-3 pr-2 h-10 hover:bg-white/[0.08] hover:border-white/[0.10] transition-all active:scale-[0.98]"
      >
        {/* Chain indicator trail */}
        <div className="flex items-center gap-1.5">
          <div
            className="h-2 w-2 rounded-full ring-2 ring-[#0b0b0f]"
            style={{ background: chainInfo.color }}
          />
          <span className="text-xs font-medium text-white/50">{chainInfo.abbr}</span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-white/[0.08]" />

        {/* Address pill */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/80 font-mono">
            {shortenAddress(address!)}
          </span>
          {/* Avatar */}
          <div
            className="h-7 w-7 rounded-full ring-2 ring-white/[0.06]"
            style={{
              background: `linear-gradient(135deg, ${chainInfo.color}, #8B5CF6, #EC4899)`,
            }}
          />
        </div>
      </button>

      {showPanel && createPortal(
        <WalletPanel
          address={address!}
          chainId={chainId}
          onDisconnect={handleDisconnect}
          onClose={() => setShowPanel(false)}
        />,
        document.body
      )}
    </div>
  );
}

function getExplorerUrl(chainParam: string | undefined = "Arc_Testnet", txHash: string) {
  if (chainParam === "Ethereum_Sepolia") return `https://sepolia.etherscan.io/tx/${txHash}`;
  if (chainParam === "Base_Sepolia") return `https://sepolia.basescan.org/tx/${txHash}`;
  return `https://testnet.arcscan.app/tx/${txHash}`;
}

/* ═══════════════════════════════════════════════
   Activity List — transaction history
   ═══════════════════════════════════════════════ */
function ActivityList() {
  const { transactions } = useTransactionHistory();

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white/15">
        <ArrowPathIcon className="size-8 mb-3" />
        <span className="text-sm">No recent activity</span>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-0.5">
      {transactions.map((tx) => {
        const explorerUrl = tx.txHash ? getExplorerUrl(tx.details.fromChain, tx.txHash) : undefined;
        const Wrapper = explorerUrl ? "a" : "div";
        
        return (
          <Wrapper
            key={tx.id}
            href={explorerUrl}
            target={explorerUrl ? "_blank" : undefined}
            rel={explorerUrl ? "noopener noreferrer" : undefined}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-white/[0.03] transition-colors ${explorerUrl ? "cursor-pointer hover:bg-white/[0.05]" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm shrink-0 ${
                tx.status === "success" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
              }`}>
                {tx.type === "swap" ? "⇄" : tx.type === "bridge" ? "⛓" : "↗"}
              </div>
              <div>
                <div className="text-sm font-medium text-white capitalize">{tx.type}</div>
                <div className="text-xs text-white/25">
                  {tx.details.amountIn && `${tx.details.amountIn} ${tx.details.tokenIn || ""}`}
                  {tx.details.tokenOut && ` → ${tx.details.tokenOut}`}
                  {tx.details.toAddress && ` → ${tx.details.toAddress.slice(0, 6)}…`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xs font-medium ${tx.status === "success" ? "text-emerald-400" : "text-red-400"}`}>
                {tx.status === "success" ? "Success" : "Failed"}
              </div>
              <div className="text-[10px] text-white/15 tabular-nums">
                {formatTimeAgo(tx.timestamp)}
              </div>
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ═══════════════════════════════════════
   SVG Icons
   ═══════════════════════════════════════ */
function WalletIcon() {
  return (
    <svg className="size-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17 6H3C2.44772 6 2 6.44772 2 7V16C2 16.5523 2.44772 17 3 17H17C17.5523 17 18 16.5523 18 16V7C18 6.44772 17.5523 6 17 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M14 12C14 12.5523 13.5523 13 13 13C12.4477 13 12 12.5523 12 12C12 11.4477 12.4477 11 13 11C13.5523 11 14 11.4477 14 12Z" fill="currentColor" />
      <path d="M4 6V5C4 3.89543 4.89543 3 6 3H14C15.1046 3 16 3.89543 16 5V6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

