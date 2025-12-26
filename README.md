# x402 Payment Protocol Demo

This project demonstrates a full-stack integration of the **x402 Payment Protocol** (by Coinbase) in a Next.js 16 application. It implements a "Pay-Per-View" model where a user must pay **0.1 USDC** on **Base Sepolia** to unlock a protected video API endpoint.

The repository serves as a reference implementation for integrating internet-native payments into web applications.

## 🚀 Features

-   **Backend**: A protected Next.js API route (`/api/video`) that returns `402 Payment Required` with standardized payment metadata.
-   **Frontend**: A React client that connects a crypto wallet (Coinbase Wallet, MetaMask, etc.) and automatically handles the payment flow.
-   **Middleware**: Uses `@x402/next` and `@x402/fetch` to abstract away the complexity of challenge-response handling.
-   **Web3 Integration**: Built with `wagmi` v2 and `viem` for robust wallet connection and chain management.

---

## 🛠 Prerequisites

Before running the project, ensure you have:

1.  **Node.js 18+** installed.
2.  **Yarn** or **npm**.
3.  A **Coinbase Wallet** or **MetaMask** browser extension.
4.  **Base Sepolia ETH** (for gas) and **USDC** on Base Sepolia testnet.
    *   *Faucet for ETH:* [coinbase.com/faucets/base-sepolia-eth](https://www.coinbase.com/faucets/base-sepolia-eth)
    *   *Faucet for USDC:* [faucet.circle.com](https://faucet.circle.com/)

---

## 📦 Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd x402-app
    ```

2.  **Install dependencies**:
    ```bash
    yarn install
    ```

3.  **Environment Configuration**:
    Create a `.env.local` file in the root directory. This keeps your private keys (if any) and environment-specific addresses secure.

    ```bash
    # .env.local
    NEXT_PUBLIC_RECIPIENT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc454e4438f44e
    NEXT_PUBLIC_USDC_ASSET_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
    ```

4.  **Run the Development Server**:
    ```bash
    yarn dev
    ```

5.  **Test the Flow**:
    Open [http://localhost:3000/x402-demo](http://localhost:3000/x402-demo), connect your wallet, and click "Buy Access".

---

## 📚 Integration Guide (How to Apply to Other Projects)

This section breaks down the core components so you can copy-paste the logic into your own apps.

### 1. Configuration (`app/constants.ts`)

Centralize your payment logic. The most critical part here is the **Asset Info** and **Atomic Units**.

*   **Crucial Insight**: x402 and EVM chains work in "atomic units" (integers). You cannot send "0.1" USDC; you must send `100000` (since USDC has 6 decimals).
*   **Crucial Insight**: EIP-712 signing requires domain parameters (`name`, `version`, `chainId`, `verifyingContract`). You must pass these to the client via the payment request.

```typescript
import { parseUnits } from 'viem';

export const USDC_ASSET_INFO = {
    address: "0x036CbD53...", // Contract Address
    name: "USDC",             // Required for EIP-712
    version: "2",             // Required for EIP-712
    chainId: 84532,           // Base Sepolia ID
    verifyingContract: "0x036CbD53...",
    decimals: 6
};

// Convert human readable "0.1" to "100000"
export const PRICE_AMOUNT = parseUnits("0.1", USDC_ASSET_INFO.decimals).toString();
```

### 2. Backend Protection (`app/api/video/route.ts`)

Wrap your API handlers with `withX402`. This middleware intercepts requests and checks for valid payment proofs. If missing, it returns the 402 error with the `price` and `payTo` details.

```typescript
import { withX402 } from "@x402/next";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";

// 1. Setup Server
const server = new x402ResourceServer(new HTTPFacilitatorClient());
registerExactEvmScheme(server, {}); // Enable EVM payments

// 2. Define Protected Logic
const handler = async (req) => {
    return NextResponse.json({ secret: "data" });
};

// 3. Export Wrapped Route
export const GET = withX402(handler, {
    accepts: {
        scheme: "exact",
        payTo: process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS,
        price: {
            amount: PRICE_AMOUNT, // Must be atomic unit string!
            asset: USDC_ASSET_INFO.address,
            extra: {
                // PASS DOMAIN PARAMS HERE so client knows how to sign
                name: USDC_ASSET_INFO.name,
                version: USDC_ASSET_INFO.version,
                chainId: USDC_ASSET_INFO.chainId,
                verifyingContract: USDC_ASSET_INFO.verifyingContract
            }
        },
        network: "eip155:84532"
    }
}, server);
```

### 3. Frontend Client (`app/x402-demo/page.tsx`)

The frontend needs three things: **Wallet Connection** (Wagmi), **x402 Client** (logic to sign), and **Fetch Wrapper** (logic to intercept 402s).

```typescript
import { useAccount, useWalletClient } from 'wagmi';
import { x402Client } from '@x402/core/client';
import { wrapFetchWithPayment } from '@x402/fetch';

// Inside your component
const { address } = useAccount();
const { data: walletClient } = useWalletClient();

const handlePayment = async () => {
    // 1. Initialize x402 Client
    const client = new x402Client();

    // 2. Adapt Wagmi WalletClient to x402 Signer
    const signer = {
        address: address,
        signTypedData: async (args) => walletClient.signTypedData(args)
    };
    registerExactEvmScheme(client, { signer });

    // 3. Wrap Fetch
    const fetchWithPay = wrapFetchWithPayment(fetch, client);

    // 4. Make Request (Must pass empty config object at minimum)
    await fetchWithPay('/api/protected-route', { method: 'GET' });
};
```

---

## 🔧 Troubleshooting & Insights

These are the common pitfalls encountered during development:

1.  **"Cannot convert 0.1 to a BigInt"**:
    *   **Cause**: You passed a decimal string (e.g., `"0.1"`) to the `amount` field.
    *   **Fix**: Always use `parseUnits` to convert to atomic integer units (e.g., `"100000"`).

2.  **"EIP-712 domain parameters ... are required"**:
    *   **Cause**: The client wallet needs to know *what* it is signing for.
    *   **Fix**: Pass `name`, `version`, `chainId`, and `verifyingContract` in the `price.extra` field in your route configuration.

3.  **"Missing fetch request configuration"**:
    *   **Cause**: `wrapFetchWithPayment` expects the second argument (`RequestInit`) to exist.
    *   **Fix**: Call it like `fetchWithPay(url, { method: 'GET' })` instead of just `fetchWithPay(url)`.

4.  **Hydration Failed / Wallet Not Connected**:
    *   **Cause**: Wagmi hooks render differently on server vs client.
    *   **Fix**: Use a `mounted` state check to only render wallet components after `useEffect` runs.

5.  **Client: Missing (Undefined WalletClient)**:
    *   **Cause**: Wallet is connected to a network not configured in Wagmi.
    *   **Fix**: Check `chainId` from `useAccount` and force a switch (`switchChain`) to Base Sepolia if it doesn't match.

---

## 📄 License

This project is open-source and available under the MIT license.
