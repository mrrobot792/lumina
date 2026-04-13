import { WalletClient } from 'viem';

export async function createClientSideAdapter(walletClient: WalletClient) {
  const { createAdapterFromProvider } = await import('@circle-fin/adapter-viem-v2');
  
  // viem WalletClient's transport exposes `request` which acts like an EIP-1193 provider.
  // We stub `on` and `removeListener` to satisfy the full EIP-1193 interface.
  const provider = {
    request: walletClient.request,
    on: () => {},
    removeListener: () => {},
  };
  
  // Sometimes createAdapterFromProvider just needs an EIP-1193 provider
  return createAdapterFromProvider({ provider });
}
