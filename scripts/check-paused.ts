import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const abi = [
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

async function main() {
  const contractAddress = "0x82ecB5c11Eda49f8E77e8617C360A5645F8612D1" as `0x${string}`;
  
  const publicClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  try {
    const paused = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: 'paused',
    });
    
    const owner = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: 'owner',
    });
    
    console.log("Contract is paused:", paused);
    console.log("Contract owner:", owner);
  } catch (error: any) {
    console.log("Error checking status:", error.message);
  }
}

main();
