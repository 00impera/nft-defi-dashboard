import 'dotenv/config';
import { ethers } from 'ethers';

async function checkBalance() {
  try {
    const wallet = process.env.PRIVATE_KEY;
    if (!wallet) {
      console.log('❌ No PRIVATE_KEY found in .env file!');
      return;
    }

    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const signer = new ethers.Wallet(wallet, provider);
    const address = signer.address;
    
    console.log('\n💼 Your Wallet:', address);
    
    const balance = await provider.getBalance(address);
    const ethBalance = ethers.formatEther(balance);
    
    console.log('💰 ETH Balance on Base:', ethBalance, 'ETH');
    console.log('💵 USD Value:', (parseFloat(ethBalance) * 3500).toFixed(2), 'USD');
    
    if (parseFloat(ethBalance) < 0.001) {
      console.log('\n⚠️  WARNING: You need at least 0.001 ETH (~$3.50) to deploy!');
      console.log('💡 You need to bridge ETH from Polygon to Base first.\n');
    } else {
      console.log('\n✅ You have enough ETH to deploy!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBalance();
