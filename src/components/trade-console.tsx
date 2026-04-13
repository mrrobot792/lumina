"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useWalletContext } from "@/providers/wallet-provider";
import { useBalances } from "@/hooks/useBalances";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  XMarkIcon,
  InformationCircleIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";

type Operation = "send-estimate" | "send" | "bridge-estimate" | "bridge" | "swap-estimate" | "swap" | "chains";
type Mode = "swap" | "bridge" | "send";

const TOKENS = [
  { symbol: "USDC", name: "USD Coin", color: "#2775CA" },
  { symbol: "EURC", name: "Euro Coin", color: "#1B4F8A" },
];

const CHAINS = [
  { id: "Arc_Testnet", label: "Arc Testnet" },
  { id: "Base_Sepolia", label: "Base Sepolia" },
  { id: "Ethereum_Sepolia", label: "Ethereum Sepolia" },
];

const defaults = {
  chain: "Arc_Testnet",
  from: "Arc_Testnet",
  toChain: "Base_Sepolia",
  to: "",
  amount: "",
  token: "USDC",
  tokenIn: "USDC",
  tokenOut: "EURC",
};

function getChainLabel(id: string) {
  return CHAINS.find((c) => c.id === id)?.label ?? id.replace(/_/g, " ");
}

function getTokenColor(symbol: string) {
  return TOKENS.find((t) => t.symbol === symbol)?.color ?? "#6366f1";
}

export function TradeConsole() {
  const [mode, setMode] = useState<Mode>("swap");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [form, setForm] = useState(defaults);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string; detail?: string } | null>(null);

  const operation: Operation = useMemo(() => {
    if (mode === "swap") return "swap";
    if (mode === "bridge") return "bridge";
    return "send";
  }, [mode]);

  // Simulated swap details (would come from estimate API in production)
  const swapDetails = useMemo(() => {
    const amt = parseFloat(form.amount) || 0;
    const rate = form.tokenIn === "USDC" && form.tokenOut === "EURC" ? 0.9231 : 1.0833;
    const output = amt * rate;
    const priceImpact = amt > 100 ? 0.12 : amt > 10 ? 0.05 : 0.01;
    const minReceived = output * (1 - parseFloat(slippage) / 100);
    const gasFee = 0.0012;

    return {
      rate,
      output: output.toFixed(4),
      priceImpact,
      minReceived: minReceived.toFixed(4),
      gasFee,
      route: `${form.tokenIn} → ${form.tokenOut}`,
      provider: "Lumina",
    };
  }, [form.amount, form.tokenIn, form.tokenOut, slippage]);

  const bridgeDetails = useMemo(() => {
    const amt = parseFloat(form.amount) || 0;
    const bridgeFee = amt * 0.001;
    const gasFee = 0.0024;
    const estimatedTime = "~2 min";

    return {
      bridgeFee: bridgeFee.toFixed(4),
      gasFee,
      estimatedTime,
      received: (amt - bridgeFee).toFixed(4),
      protocol: "Circle CCTP",
    };
  }, [form.amount]);

  const { isConnected, isInitializing, address, chainId } = useWalletContext();
  const { balances, refetch } = useBalances(address, chainId);
  const { addTransaction } = useTransactionHistory();

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Helper: get formatted balance for a given token symbol
  const getTokenBalance = useCallback((symbol: string) => {
    if (!isConnected || balances.length === 0) return "0";
    const found = balances.find((b) => b.symbol === symbol);
    return found ? found.balance : "0";
  }, [isConnected, balances]);

  const buttonLabel = useMemo(() => {
    if (isInitializing) return "Initializing...";
    if (!isConnected) return "Connect Wallet";
    if (status === "running") return "Processing...";
    if (!form.amount && mode !== "send") return "Enter an amount";
    if (mode === "swap") return "Swap";
    if (mode === "bridge") return "Bridge";
    return "Send";
  }, [isConnected, isInitializing, status, form, mode]);

  const isDisabled = isInitializing ? true : (!isConnected) ? false : (status === "running" || (!form.amount && mode !== "send"));
  const hasAmount = parseFloat(form.amount) > 0;

  const handleSwapTokens = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      tokenIn: prev.tokenOut,
      tokenOut: prev.tokenIn,
    }));
  }, []);

  const handleSwapChains = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      from: prev.toChain,
      toChain: prev.from,
    }));
  }, []);

  async function run() {
    if (!isConnected) {
      // Wallet connection is handled by the navbar WalletButton
      return;
    }

    setStatus("running");
    setToast(null);

    try {
      const body: Record<string, string> = {
        operation,
      };

      if (mode === "swap") {
        body.chain = form.chain;
        body.tokenIn = form.tokenIn;
        body.tokenOut = form.tokenOut;
        body.amount = form.amount || "0";
      } else if (mode === "bridge") {
        body.from = form.from;
        body.toChain = form.toChain;
        body.amount = form.amount || "0";
      } else {
        body.chain = form.chain;
        body.to = form.to;
        body.amount = form.amount || "0";
        body.token = form.token;
      }

      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Operation failed");
      }

      // Build human-readable summary
      let summary = "";
      if (mode === "swap") {
        summary = `${form.amount} ${form.tokenIn} → ${form.tokenOut}`;
      } else if (mode === "bridge") {
        summary = `${form.amount} USDC · ${getChainLabel(form.from)} → ${getChainLabel(form.toChain)}`;
      } else {
        summary = `${form.amount} ${form.token} → ${form.to.slice(0, 8)}…`;
      }

      // Save to history
      addTransaction({
        type: mode,
        status: "success",
        details: {
          amountIn: form.amount,
          tokenIn: mode === "swap" ? form.tokenIn : (mode === "bridge" ? "USDC" : form.token),
          tokenOut: mode === "swap" ? form.tokenOut : undefined,
          fromChain: mode === "bridge" ? form.from : form.chain,
          toChain: mode === "bridge" ? form.toChain : undefined,
          toAddress: mode === "send" ? form.to : undefined,
        },
      });

      setToast({ type: "success", message: `${mode.charAt(0).toUpperCase() + mode.slice(1)} successful`, detail: summary });
      setStatus("done");

      // Reset amount after success
      setForm((prev) => ({ ...prev, amount: "" }));

      // Refetch balances
      refetch();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unexpected error";

      addTransaction({
        type: mode,
        status: "error",
        details: {
          amountIn: form.amount,
          tokenIn: mode === "swap" ? form.tokenIn : form.token,
        },
        message: errMsg,
      });

      setToast({ type: "error", message: `${mode.charAt(0).toUpperCase() + mode.slice(1)} failed`, detail: errMsg });
      setStatus("error");
    }
  }

  return (
    <div className="w-full space-y-3">
      {/* ───── Main Card ───── */}
      <div className="rounded-3xl border border-white/[0.06] bg-[#12131a] shadow-2xl">
        {/* Header: Mode tabs + Settings */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex gap-1">
            {(["swap", "bridge", "send"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setShowDetails(false); }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? "bg-white/[0.08] text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`rounded-full p-2 transition-colors ${showSettings ? "bg-white/[0.08] text-white" : "text-white/30 hover:text-white/60 hover:bg-white/[0.05]"}`}
          >
            <Cog6ToothIcon className="size-[18px]" />
          </button>
        </div>

        {/* Settings drawer */}
        {showSettings && (
          <div className="mx-3 mb-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Settings</span>
              <button onClick={() => setShowSettings(false)} className="text-white/30 hover:text-white/60">
                <XMarkIcon className="size-4" />
              </button>
            </div>
            {/* Slippage */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-white/60">Max. slippage</span>
                <InformationCircleIcon className="size-3.5 text-white/20" />
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-0.5 border border-white/[0.06]">
                {["0.1", "0.5", "1.0"].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSlippage(val)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      slippage === val ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    {val}%
                  </button>
                ))}
                <div className="flex items-center border-l border-white/[0.06] pl-1">
                  <input
                    type="text"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-10 bg-transparent text-center text-xs font-medium text-white outline-none"
                  />
                  <span className="text-xs text-white/30 pr-1">%</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Body */}
        <div className="px-3 pb-3">
          {/* ─── Swap ─── */}
          {mode === "swap" && (
            <div className="relative">
              <TokenPanel
                label="You pay"
                amount={form.amount}
                onAmountChange={(v) => setForm({ ...form, amount: v })}
                token={form.tokenIn}
                onTokenChange={(t) => setForm({ ...form, tokenIn: t })}
                network={getChainLabel(form.chain)}
                balance={getTokenBalance(form.tokenIn)}
              />
              <div className="relative z-10 flex justify-center -my-2.5">
                <button
                  onClick={handleSwapTokens}
                  className="rounded-xl border-4 border-[#12131a] bg-[#1c1d27] p-2 text-white/50 hover:text-white hover:bg-[#252633] transition-all active:scale-90"
                >
                  <ArrowsUpDownIcon className="size-4" />
                </button>
              </div>
              <TokenPanel
                label="You receive"
                amount={hasAmount ? swapDetails.output : ""}
                onAmountChange={() => {}}
                token={form.tokenOut}
                onTokenChange={(t) => setForm({ ...form, tokenOut: t })}
                network={getChainLabel(form.chain)}
                readOnly
                dimmed
                balance={getTokenBalance(form.tokenOut)}
              />
            </div>
          )}

          {/* ─── Bridge ─── */}
          {mode === "bridge" && (
            <div className="relative">
              <TokenPanel
                label="Transfer from"
                amount={form.amount}
                onAmountChange={(v) => setForm({ ...form, amount: v })}
                token="USDC"
                onTokenChange={() => {}}
                network={getChainLabel(form.from)}
                balance={getTokenBalance("USDC")}
              />
              <div className="relative z-10 flex justify-center -my-2.5">
                <button
                  onClick={handleSwapChains}
                  className="rounded-xl border-4 border-[#12131a] bg-[#1c1d27] p-2 text-white/50 hover:text-white hover:bg-[#252633] transition-all active:scale-90"
                >
                  <ArrowsUpDownIcon className="size-4" />
                </button>
              </div>
              <TokenPanel
                label="Receive on"
                amount={hasAmount ? bridgeDetails.received : ""}
                onAmountChange={() => {}}
                token="USDC"
                onTokenChange={() => {}}
                network={getChainLabel(form.toChain)}
                readOnly
                dimmed
              />
            </div>
          )}

          {/* ─── Send ─── */}
          {mode === "send" && (
            <div className="space-y-1">
              <TokenPanel
                label="You send"
                amount={form.amount}
                onAmountChange={(v) => setForm({ ...form, amount: v })}
                token={form.token}
                onTokenChange={(t) => setForm({ ...form, token: t })}
                network={getChainLabel(form.chain)}
                balance={getTokenBalance(form.token)}
              />
              <div className="rounded-2xl bg-[#1c1d27] p-4">
                <div className="mb-2 text-xs text-white/30 font-medium">Recipient address</div>
                <input
                  type="text"
                  value={form.to}
                  onChange={(e) => setForm({ ...form, to: e.target.value })}
                  className="w-full bg-transparent text-base text-white/90 outline-none placeholder:text-white/15 font-mono"
                  placeholder="0x..."
                />
              </div>
            </div>
          )}

          {/* ─── Swap / Bridge Details ─── */}
          {hasAmount && (mode === "swap" || mode === "bridge") && (
            <div className="mt-2">
              {/* Rate line + expand toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-white/40 hover:bg-white/[0.02] transition-colors"
              >
                {mode === "swap" ? (
                  <span>
                    1 {form.tokenIn} = {swapDetails.rate.toFixed(4)} {form.tokenOut}
                  </span>
                ) : (
                  <span>
                    Est. arrival: {bridgeDetails.estimatedTime}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <BoltIcon className="size-3 text-emerald-400" />
                  <span className="text-emerald-400">${mode === "swap" ? swapDetails.gasFee : bridgeDetails.gasFee}</span>
                  {showDetails ? (
                    <ChevronUpIcon className="size-3.5 ml-1" />
                  ) : (
                    <ChevronDownIcon className="size-3.5 ml-1" />
                  )}
                </div>
              </button>

              {/* Expanded details */}
              {showDetails && (
                <div className="mt-1 rounded-2xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 space-y-2.5 text-xs">
                  {mode === "swap" && (
                    <>
                      <DetailRow
                        label="Price impact"
                        value={`${swapDetails.priceImpact}%`}
                        valueColor={swapDetails.priceImpact < 0.1 ? "text-emerald-400" : swapDetails.priceImpact < 0.5 ? "text-amber-400" : "text-red-400"}
                      />
                      <DetailRow label="Min. received" value={`${swapDetails.minReceived} ${form.tokenOut}`} />
                      <DetailRow label="Max. slippage" value={`${slippage}%`} />
                      <DetailRow
                        label="Network fee"
                        value={`~$${swapDetails.gasFee}`}
                        icon={<BoltIcon className="size-3 text-emerald-400" />}
                      />
                      <DetailRow label="Route" value={swapDetails.route} />
                      <DetailRow label="Order routing" value={swapDetails.provider} />
                    </>
                  )}

                  {mode === "bridge" && (
                    <>
                      <DetailRow label="Bridge fee" value={`${bridgeDetails.bridgeFee} USDC`} />
                      <DetailRow
                        label="Network fee"
                        value={`~$${bridgeDetails.gasFee}`}
                        icon={<BoltIcon className="size-3 text-emerald-400" />}
                      />
                      <DetailRow label="Est. time" value={bridgeDetails.estimatedTime} />
                      <DetailRow label="You receive" value={`${bridgeDetails.received} USDC`} />
                      <DetailRow label="Protocol" value={bridgeDetails.protocol} />
                      <DetailRow label="Max. slippage" value={`${slippage}%`} />
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── Send Details ─── */}
          {hasAmount && mode === "send" && (
            <div className="mt-2 rounded-2xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 space-y-2.5 text-xs">
              <DetailRow
                label="Network fee"
                value="~$0.0008"
                icon={<BoltIcon className="size-3 text-emerald-400" />}
              />
              <DetailRow label="Network" value={getChainLabel(form.chain)} />
              <DetailRow label="Est. time" value="< 1 sec" />
            </div>
          )}

          {/* ─── Action Button ─── */}
          <button
            onClick={run}
            disabled={isDisabled}
            className={`mt-3 w-full rounded-2xl py-4 text-base font-semibold transition-all duration-200 ${
              isInitializing
                ? "bg-white/[0.04] text-white/20 cursor-wait animate-pulse"
                : isDisabled
                ? "bg-white/[0.04] text-white/20 cursor-not-allowed"
                : "bg-gradient-to-r from-sky-500 to-sky-400 text-white hover:from-sky-400 hover:to-sky-300 active:scale-[0.99] shadow-lg shadow-sky-500/10"
            }`}
          >
            {status === "running" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing...
              </span>
            ) : (
              buttonLabel
            )}
          </button>
        </div>
      </div>

      {/* ───── Toast Notification ───── */}
      {toast && (
        <div className={`rounded-2xl border overflow-hidden animate-fade-in ${
          toast.type === "success"
            ? "border-emerald-500/20 bg-emerald-500/[0.06]"
            : "border-red-500/20 bg-red-500/[0.06]"
        }`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              toast.type === "success" ? "bg-emerald-500/20" : "bg-red-500/20"
            }`}>
              {toast.type === "success" ? (
                <svg className="size-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <XMarkIcon className="size-4 text-red-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold ${toast.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                {toast.message}
              </div>
              {toast.detail && (
                <div className="text-xs text-white/40 truncate mt-0.5">{toast.detail}</div>
              )}
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-white/20 hover:text-white/50 transition-colors shrink-0"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   Token Panel — reusable input card
   ═══════════════════════════════════════ */
function TokenPanel({
  label,
  amount,
  onAmountChange,
  token,
  onTokenChange,
  network,
  readOnly = false,
  dimmed = false,
  balance,
}: {
  label: string;
  amount: string;
  onAmountChange: (v: string) => void;
  token: string;
  onTokenChange: (v: string) => void;
  network: string;
  readOnly?: boolean;
  dimmed?: boolean;
  balance?: string;
}) {
  return (
    <div className={`rounded-2xl bg-[#1c1d27] p-4 transition-colors ${dimmed ? "opacity-70" : ""} ${!readOnly ? "focus-within:ring-1 focus-within:ring-white/[0.08]" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/30 font-medium">{label}</span>
        <span className="text-xs text-white/20">{network}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          readOnly={readOnly}
          placeholder="0"
          className={`w-full min-w-0 bg-transparent text-[2rem] leading-tight font-medium outline-none placeholder:text-white/10 ${
            readOnly ? "text-white/40 cursor-default" : "text-white"
          }`}
        />
        <TokenBadge symbol={token} onChange={onTokenChange} />
      </div>
      {/* Balance row */}
      {balance && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-white/15">
            {amount && !readOnly ? `$${(parseFloat(amount) || 0).toFixed(2)}` : ""}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/20">Balance: {balance}</span>
            {!readOnly && (
              <button
                onClick={() => onAmountChange(balance.replace(/,/g, ""))}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 transition-colors"
              >
                MAX
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   Token Badge — pill-shaped selector
   ═══════════════════════════════════════ */
function TokenBadge({
  symbol,
  onChange,
}: {
  symbol: string;
  onChange: (v: string) => void;
}) {
  const color = getTokenColor(symbol);
  
  function getTokenIcon(sym: string) {
    if (sym === "USDC") return "/tokens/usdc.png";
    if (sym === "EURC") return "/tokens/eurc.png";
    if (sym === "ETH") return "/tokens/eth.png";
    return null;
  }
  
  const icon = getTokenIcon(symbol);

  return (
    <div className="group relative flex shrink-0 items-center gap-2 rounded-full bg-white/[0.06] py-1.5 pl-2 pr-3 hover:bg-white/[0.10] transition-colors cursor-pointer border border-white/[0.04]">
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white overflow-hidden"
        style={{ background: icon ? 'transparent' : color }}
      >
        {icon ? (
          <img src={icon} alt={symbol} className="w-full h-full object-cover" />
        ) : (
          symbol.charAt(0)
        )}
      </div>
      <select
        value={symbol}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent text-base font-semibold text-white outline-none cursor-pointer pr-4"
      >
        {TOKENS.map((t) => (
          <option key={t.symbol} value={t.symbol} className="bg-[#1c1d27] text-white">
            {t.symbol}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="absolute right-2 size-3.5 text-white/30 pointer-events-none" />
    </div>
  );
}

/* ═══════════════════════════════════════
   Detail Row — key-value for tx info
   ═══════════════════════════════════════ */
function DetailRow({
  label,
  value,
  valueColor,
  icon,
}: {
  label: string;
  value: string;
  valueColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <span className="text-white/35">{label}</span>
        <InformationCircleIcon className="size-3 text-white/15" />
      </div>
      <div className="flex items-center gap-1">
        {icon}
        <span className={valueColor || "text-white/60"}>{value}</span>
      </div>
    </div>
  );
}
