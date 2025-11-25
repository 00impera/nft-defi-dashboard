import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

async function main() {
  const treasuryAddress = "0x592B35c8917eD36c39Ef73D0F5e92B0173560b2e" as `0x${string}`;
  
  const publicClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  const balance = await publicClient.getBalance({ address: treasuryAddress });
  
  console.log("Treasury Address:", treasuryAddress);
  console.log("ETH Balance:", (Number(balance) / 1e18).toFixed(4), "ETH");
  console.log("\nView on BaseScan:");
  console.log("https://basescan.org/address/" + treasuryAddress);
}

main();
