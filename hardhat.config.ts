import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    base: {
      type: "http",
      chainType: "l1",
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.BASE_PRIVATE_KEY ? [process.env.BASE_PRIVATE_KEY] : [],
    },
  },
});
