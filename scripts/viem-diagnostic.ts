import "@nomicfoundation/hardhat-toolbox-viem";
import hre from "hardhat";

async function main() {
  console.log("Hardhat version:", hre.config.hardhatVersion || "unknown");
  console.log("hre.viem:", typeof hre.viem);
  if (hre.viem) {
    console.log("hre.viem.getWalletClients:", typeof hre.viem.getWalletClients);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

