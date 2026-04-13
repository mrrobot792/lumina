"use client";

import { TradeConsole } from "@/components/trade-console";
import { WalletButton } from "@/components/wallet-button";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-start bg-[#0b0b0f] px-4 pt-16 pb-20 overflow-hidden">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute top-[-200px] left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.06)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute top-[-100px] left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.04)_0%,transparent_70%)]" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 backdrop-blur-md bg-[#0b0b0f]/70 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-[10px] overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.3)] border border-white/10 bg-white/[0.02]">
            <img src="/lumina-logo.png" alt="Lumina DEX" className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Lumina</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Testnet
          </div>
          <WalletButton />
        </div>
      </nav>

      {/* Trade Card */}
      <div className="relative z-10 w-full max-w-[460px] mt-12">
        <TradeConsole />
      </div>

      {/* Footer info */}
      <p className="mt-8 text-center text-xs text-white/20">
        Lumina on Arc Testnet · Powered by Circle CCTP
      </p>
    </main>
  );
}
