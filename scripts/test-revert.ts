import { createPublicClient, http, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';

const abi = [
  {
    "inputs": [{"internalType": "uint256", "name": "_profitRate", "type": "uint256"}],
    "name": "setProfitRate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

async function main() {
  const contractAddress = "0x82ecB5c11Eda49f8E77e8617C360A5645F8612D1" as `0x${string}`;
  const from = "0x4aC660574c02f242754E35a142EB37d90fF66d4d" as `0x${string}`;
  
  const publicClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  try {
    // Try to call setProfitRate(1500)
    const data = encodeFunctionData({
      abi,
      functionName: 'setProfitRate',
      args: [1500n]
    });

    const result = await publicClient.call({
      to: contractAddress,
      from: from,
      data: data,
    });

    console.log("Call succeeded:", result);
  } catch (error: any) {
    console.log("Revert reason:", error.message);
    console.log("Full error:", error);
  }
}

main();
