import { parseUnits } from 'viem';

// Base Sepolia USDC Address
// https://sepolia.basescan.org/token/0x036CbD53842c5426634e7929541eC2318f3dCF7e

export const USDC_ASSET_INFO = {
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    name: "USDC", // The name used in EIP-712 domain
    version: "2", // The version used in EIP-712 domain (USDC v2)
    chainId: 84532,
    verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    decimals: 6
};

// 0.1 USDC with 6 decimals = 100000
export const VIDEO_PRICE_AMOUNT = parseUnits("0.1", USDC_ASSET_INFO.decimals).toString();
export const BASE_SEPOLIA_NETWORK_ID = "eip155:84532";
export const PAYMENT_SCHEME = "exact";

// Fallbacks for environment variables in case they are not set
export const DEFAULT_RECIPIENT_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
// USDC on Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
export const DEFAULT_USDC_ASSET_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export const APP_CONFIG = {
  video: {
    title: "Rick Astley - Never Gonna Give You Up",
    videoId: "dQw4w9WgXcQ",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    successMessage: "Thank you for your payment! Enjoy the video."
  }
};
