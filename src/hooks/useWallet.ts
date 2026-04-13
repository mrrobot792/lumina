"use client";

import { useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    ethereum?: any;
    okxwallet?: any;
    rabby?: any;
  }
}

export type WalletType = "metamask" | "coinbase" | "rabby" | "okx";

// Helper to find specific provider when multiple extensions inject into window.ethereum
function getEthereumProvider(type?: WalletType | null) {
  if (typeof window === "undefined") return null;

  // OKX Wallet usually injects window.okxwallet directly as EIP-1193, or sets isOkxWallet on window.ethereum
  // Rabby Wallet injects isRabby on window.ethereum
  
  if (type === "okx" && window.okxwallet) return window.okxwallet;

  const eth = window.ethereum;
  if (!eth) return null;
  
  // Handle multiple injected providers
  if (eth.providers && Array.isArray(eth.providers)) {
    if (type === "metamask") return eth.providers.find((p: any) => p.isMetaMask && !p.isRabby && !p.isOkxWallet);
    if (type === "coinbase") return eth.providers.find((p: any) => p.isCoinbaseWallet);
    if (type === "rabby") return eth.providers.find((p: any) => p.isRabby);
    if (type === "okx") return eth.providers.find((p: any) => p.isOkxWallet);
    
    // Default fallback
    return eth.providers[0];
  }

  // Fallback if only one provider is injected
  if (type === "metamask" && eth.isMetaMask && !eth.isRabby && !eth.isOkxWallet) return eth;
  if (type === "coinbase" && eth.isCoinbaseWallet) return eth;
  if (type === "rabby" && eth.isRabby) return eth;
  if (type === "okx" && eth.isOkxWallet) return eth;
  
  if (!type) return eth;
  
  return null;
}

export type WalletState = {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isInitializing: boolean;
  error: string | null;
  activeProviderType: WalletType | null;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    isConnecting: false,
    isInitializing: true,
    error: null,
    activeProviderType: null,
  });

  // Check if already connected on mount
  useEffect(() => {
    let savedType = null;
    try {
      savedType = localStorage.getItem("connectedWalletType") as WalletType | null;
    } catch {}

    // Eğer daha önce bağlanılmış bir cüzdan kaydedilmişse otomatik bağlanmayı dene.
    // Kaydedilmemişse (veya kullanıcı disconnect dediyse) deneme, isInitializing'i kapat.
    if (!savedType) {
      setState((prev) => ({ ...prev, isInitializing: false }));
      return;
    }

    const provider = getEthereumProvider(savedType);
    if (!provider) {
      setState((prev) => ({ ...prev, isInitializing: false }));
      return;
    }

    provider
      .request({ method: "eth_accounts" })
      .then((accounts: any) => {
        const accs = accounts as string[];
        if (accs.length > 0) {
          provider.request({ method: "eth_chainId" }).then((chainId: any) => {
            setState({
              isConnected: true,
              address: accs[0],
              chainId: parseInt(chainId as string, 16),
              isConnecting: false,
              isInitializing: false,
              error: null,
              activeProviderType: savedType,
            });
          });
        } else {
          setState((prev) => ({ ...prev, isInitializing: false }));
        }
      })
      .catch(() => {
        setState((prev) => ({ ...prev, isInitializing: false }));
      });
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    const provider = getEthereumProvider(state.activeProviderType);
    if (!provider) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        setState({ isConnected: false, address: null, chainId: null, isConnecting: false, isInitializing: false, error: null, activeProviderType: null });
        localStorage.removeItem("connectedWalletType");
      } else {
        setState((prev) => ({ ...prev, isConnected: true, address: accounts[0] }));
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const chainId = args[0] as string;
      setState((prev) => ({ ...prev, chainId: parseInt(chainId, 16) }));
    };

    if (provider.on) {
      provider.on("accountsChanged", handleAccountsChanged);
      provider.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (provider.removeListener) {
        provider.removeListener("accountsChanged", handleAccountsChanged);
        provider.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [state.activeProviderType]);

  const switchChain = useCallback(async (targetChainId: number) => {
    const provider = getEthereumProvider(state.activeProviderType);
    if (!provider) throw new Error("Cüzdan bulunamadı.");
    const hexChainId = `0x${targetChainId.toString(16)}`;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      // 4902: Ağ henüz cüzdana eklenmemiş
      if (switchError.code === 4902) {
        // Arc Testnet özel durumu
        if (targetChainId === 5042002) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexChainId,
                chainName: "Arc Testnet",
                nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
                rpcUrls: ["https://rpc.testnet.arc.network"],
                blockExplorerUrls: ["https://testnet.arcscan.app"],
              },
            ],
          });
        } else {
          throw new Error("Bu ağ cüzdanınızda bulunamadı, lütfen manuel ekleyin.");
        }
      } else {
        throw switchError;
      }
    }
  }, [state.activeProviderType]);

  const connect = useCallback(async (walletType: WalletType = "metamask", targetChainId?: number) => {
    const provider = getEthereumProvider(walletType);
    if (!provider) {
      setState((prev) => ({ ...prev, error: `Wallet not installed: ${walletType}` }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];

      let currentChainId = parseInt(
        (await provider.request({ method: "eth_chainId" })) as string,
        16
      );

      // Zeno mantığı: İstediğimiz ağdaysak sorun yok, değilsek değiştirmeye zorla/ekle
      if (targetChainId && currentChainId !== targetChainId) {
        await switchChain(targetChainId);
        currentChainId = targetChainId; // Eğer hata atmazsa ağ değişmiş demektir
      }

      setState({
        isConnected: true,
        address: accounts[0],
        chainId: currentChainId,
        isConnecting: false,
        isInitializing: false,
        error: null,
        activeProviderType: walletType,
      });
      
      localStorage.setItem("connectedWalletType", walletType);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection rejected";
      setState((prev) => ({ ...prev, isConnecting: false, error: message }));
    }
  }, [switchChain]);

  const disconnect = useCallback(() => {
    setState({ isConnected: false, address: null, chainId: null, isConnecting: false, isInitializing: false, error: null, activeProviderType: null });
    localStorage.removeItem("connectedWalletType");
  }, []);

  const signMessage = useCallback(async (message: string) => {
    const provider = getEthereumProvider(state.activeProviderType);
    if (!provider || !state.address) throw new Error("Cüzdan bağlı değil");

    const signature = await provider.request({
      method: "personal_sign",
      params: [message, state.address],
    });

    return signature as string;
  }, [state.address, state.activeProviderType]);

  return { ...state, connect, disconnect, signMessage, switchChain };
}
