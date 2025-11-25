import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const abi = [
  {
    "inputs": [{"internalType": "address", "name": "_profitWallet", "type": "address"}],
    "name": "setProfitWallet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_profitRate", "type": "uint256"}],
    "name": "setProfitRate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "profitWallet",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "profitRate",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

async function main() {
  const privateKey = process.env.BASE_PRIVATE_KEY;
  if (!privateKey) throw new Error("BASE_PRIVATE_KEY not found");

  const contractAddress = "0x82ecB5c11Eda49f8E77e8617C360A5645F8612D1" as `0x${string}`;
  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`);
  const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";

  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: base, transport: http(rpcUrl) });

  console.log("From:", account.address);
  console.log("Contract:", contractAddress, "\n");

  // Check current values
  const currentWallet = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'profitWallet',
  });
  const currentRate = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'profitRate',
  });

  console.log("Current profit wallet:", currentWallet);
  console.log("Current profit rate:", currentRate.toString(), "\n");

  // TRY 1: Just update the profit rate (skip wallet for now)
  console.log("=== Updating Profit Rate ===");
  try {
    const newRate = 1500n; // 15%
    
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi,
      functionName: 'setProfitRate',
      args: [newRate],
    });
    
    console.log("Transaction sent:", hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✓ Success! Status:", receipt.status);
    
    // Verify
    const verifyRate = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: 'profitRate',
    });
    console.log("New profit rate:", verifyRate.toString());
  } catch (error: any) {
    console.error("❌ Failed:", error.shortMessage || error.message);
  }

  console.log("\n=== Updating Profit Wallet ===");
  try {
    // Use a completely new address
    const newWallet = "0x1234567890123456789012345678901234567890" as `0x${string}`;
    
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi,
      functionName: 'setProfitWallet',
      args: [newWallet],
    });
    
    console.log("Transaction sent:", hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✓ Success! Status:", receipt.status);
    
    // Verify
    const verifyWallet = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: 'profitWallet',
    });
    console.log("New profit wallet:", verifyWallet);
  } catch (error: any) {
    console.error("❌ Failed:", error.shortMessage || error.message);
  }
}

main().catch(console.error);
