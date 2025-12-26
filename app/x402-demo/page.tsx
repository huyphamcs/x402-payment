'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWalletClient, useChainId, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { wrapFetchWithPayment } from '@x402/fetch';

export default function X402Demo() {
  const { address, isConnected, chainId: currentChainId } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: walletClient, refetch: refetchWalletClient } = useWalletClient();
  
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [videoData, setVideoData] = useState<{ title: string; url: string; videoId: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Refetch wallet client when address changes or connection status changes
  useEffect(() => {
    if (isConnected && address) {
      refetchWalletClient();
    }
  }, [isConnected, address, refetchWalletClient]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const handleConnect = (connector: any) => {
    connect({ connector });
  };
  
  // Don't render until mounted on client
  if (!mounted) return null;

  const handleBuyAccess = async () => {
    // Check network first
    if (currentChainId !== baseSepolia.id) {
      addLog(`Wrong network (Chain ID: ${currentChainId}). Switching to Base Sepolia...`);
      try {
        switchChain({ chainId: baseSepolia.id });
        // Wait for the switch to happen and client to update
        // In a real app we might want to wait for the effect, but let's return for now and let the user click again
        // or rely on the effect to refetch the client.
        return; 
      } catch (err: any) {
        addLog(`Failed to switch network: ${err.message}`);
        return;
      }
    }

    if (!walletClient || !address) {
      addLog(`Wallet check failed. Address: ${address ? 'Present' : 'Missing'}, Client: ${walletClient ? 'Present' : 'Missing'}`);
      // Try one last refetch
      refetchWalletClient();
      return;
    }

    setLoading(true);
    addLog("Initiating request...");

    try {
      // Initialize x402 client
      const client = new x402Client();
      
      // Adapt WalletClient to ClientEvmSigner
      const signer = {
        address: address,
        signTypedData: async (args: any) => {
          return await walletClient.signTypedData(args);
        }
      };

      // Register Base Sepolia scheme
      // The register function handles standard EVM networks
      registerExactEvmScheme(client, { signer });

      // Wrap fetch
      const fetchWithPay = wrapFetchWithPayment(fetch, client);

      addLog("Sending request to API...");
      // This call will trigger the 402 flow automatically
      // We must pass an empty object as the second argument to satisfy the wrapFetchWithPayment requirement
      // for "fetch request configuration" as hinted by the error
      const res = await fetchWithPay('/api/video', {
        method: 'GET'
      });
      
      if (res.ok) {
        const data = await res.json();
        setVideoData(data);
        addLog("Payment successful! Content unlocked.");
      } else {
        addLog(`Request failed: ${res.status} ${res.statusText}`);
        const errText = await res.text();
        addLog(`Error details: ${errText}`);
      }
    } catch (error: any) {
      console.error(error);
      addLog(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)] max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">x402 Payment Demo</h1>

      <div className="bg-white/5 p-6 rounded-lg mb-8 border border-white/10">
        <h2 className="text-xl font-semibold mb-4">1. Connect Wallet</h2>
        {!isConnected ? (
          <div className="flex flex-col gap-2">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => handleConnect(connector)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors text-left"
              >
                Connect {connector.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="font-mono bg-black/20 px-3 py-1 rounded">{address}</span>
            <button
              onClick={() => disconnect()}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      <div className="bg-white/5 p-6 rounded-lg mb-8 border border-white/10">
        <h2 className="text-xl font-semibold mb-4">2. Buy Content</h2>
        <p className="mb-4 text-gray-400">
          This will fetch protected content from <code>/api/video</code>. 
          If you haven't paid, the x402 protocol will request a payment of <strong>0.1 USDC</strong> on Base Sepolia.
        </p>
        
        <button
          onClick={handleBuyAccess}
          disabled={!isConnected || loading}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors w-full sm:w-auto"
        >
          {loading ? 'Processing Payment...' : 'Buy Access (0.1 USDC)'}
        </button>
      </div>

      {videoData && (
        <div className="bg-white/5 p-6 rounded-lg mb-8 border border-green-500/30">
          <h2 className="text-xl font-semibold mb-4 text-green-400">Unlocked Content</h2>
          <p className="text-lg mb-4">{videoData.title}</p>
          <div className="aspect-video w-full">
            <iframe 
              width="100%" 
              height="100%" 
              src={`https://www.youtube.com/embed/${videoData.videoId}?autoplay=1`}
              title="YouTube video player" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
              className="rounded"
            ></iframe>
          </div>
        </div>
      )}

      <div className="bg-black/40 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
        <h3 className="text-gray-500 mb-2 border-b border-gray-700 pb-1">Activity Log</h3>
        {logs.length === 0 && <span className="text-gray-600 italic">No activity yet...</span>}
        {logs.map((log, i) => (
          <div key={i} className="mb-1">{log}</div>
        ))}
      </div>
    </div>
  );
}

