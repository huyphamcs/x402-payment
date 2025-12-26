import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { 
    VIDEO_PRICE_AMOUNT, 
    BASE_SEPOLIA_NETWORK_ID, 
    PAYMENT_SCHEME, 
    APP_CONFIG,
    DEFAULT_RECIPIENT_ADDRESS,
    DEFAULT_USDC_ASSET_ADDRESS,
    USDC_ASSET_INFO
} from "../../constants";

// Initialize the x402 server
// Using the default facilitator URL by not passing config
const facilitator = new HTTPFacilitatorClient();
const server = new x402ResourceServer(facilitator);

// Register the EVM scheme (Base Sepolia is an EVM chain)
registerExactEvmScheme(server, {});

// The actual content handler
const handler = async (req: NextRequest) => {
    // This code only runs AFTER payment is verified
    return NextResponse.json({
        title: APP_CONFIG.video.title,
        videoId: APP_CONFIG.video.videoId,
        url: APP_CONFIG.video.url,
        message: APP_CONFIG.video.successMessage
    });
};

// Wrap with x402 protection
export const GET = withX402(handler, {
    accepts: {
        scheme: PAYMENT_SCHEME,
        payTo: process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS || DEFAULT_RECIPIENT_ADDRESS, 
        price: { 
            amount: VIDEO_PRICE_AMOUNT, 
            asset: process.env.NEXT_PUBLIC_USDC_ASSET_ADDRESS || DEFAULT_USDC_ASSET_ADDRESS,
            extra: {
                // Pass EIP-712 domain parameters required by the client/signer
                name: USDC_ASSET_INFO.name,
                version: USDC_ASSET_INFO.version,
                chainId: USDC_ASSET_INFO.chainId,
                verifyingContract: USDC_ASSET_INFO.verifyingContract
            }
        },
        network: BASE_SEPOLIA_NETWORK_ID 
    },
    description: "Premium Video Content"
}, server);

