import "@nomicfoundation/hardhat-toolbox-viem"; // <-- Ensure the plugin is loaded!
import hre from "hardhat";

async function main() {
  // Get the deployer client
  const [deployer] = await hre.viem.getWalletClients();

  // Your deployment parameters
  const profitWallet = deployer.account.address;
  const profitRate = 500;
  const uniswapRouter = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24";
  const aavePool = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";

  console.log("Deploying CryptoLockerDeFi with NFT Minting...");
  console.log("Deployer address:", profitWallet);

  // Deploy the contract
  const { contractAddress, transactionHash } = await hre.viem.deployContract(
    "CryptoLockerDeFi",
    [profitWallet, profitRate, uniswapRouter, aavePool],
  );

  console.log("\n✅ CryptoLockerDeFi deployed to:", contractAddress);
  console.log("Transaction hash:", transactionHash);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

