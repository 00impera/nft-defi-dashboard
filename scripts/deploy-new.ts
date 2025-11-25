import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';

async function main() {
  const privateKey = process.env.BASE_PRIVATE_KEY;
  if (!privateKey) throw new Error("BASE_PRIVATE_KEY not found");

  const account = privateKeyToAccount(
    privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}` as `0x${string}`
  );
  const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";

  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: base, transport: http(rpcUrl) });

  console.log("Deploying from:", account.address);
  
  // Read compiled contract
  const artifact = JSON.parse(
    readFileSync('artifacts/contracts/CryptoLockerEnhanced.sol/CryptoLockerDeFi.json', 'utf8')
  );

  // Constructor parameters
  const profitWallet = "0x592B35c8917eD36c39Ef73D0F5e92B0173560b2e";
  const profitRate = 500;
  const uniswapRouter = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24";
  const aavePool = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";

  console.log("\nDeployment parameters:");
  console.log("- Profit Wallet:", profitWallet);
  console.log("- Profit Rate:", profitRate);

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [profitWallet, profitRate, uniswapRouter, aavePool],
  });

  console.log("\nDeploy transaction:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  console.log("\n✅ Contract deployed!");
  console.log("Address:", receipt.contractAddress);
  console.log("\nSave this address!");
}

main().catch(console.error);
