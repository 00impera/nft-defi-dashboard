import 'dotenv/config';
import { ethers } from 'ethers';

async function checkPolygon() {
  try {
    const wallet = process.env.PRIVATE_KEY;
    const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
    const signer = new ethers.Wallet(wallet, provider);
    
    console.log('\n💼 Your Wallet:', signer.address);
    
    const balance = await provider.getBalance(signer.address);
    const ethBalance = ethers.formatEther(balance);
    
    console.log('💰 ETH Balance on Polygon:', ethBalance, 'ETH');
    console.log('💵 USD Value:', (parseFloat(ethBalance) * 3500).toFixed(2), 'USD\n');
    
    if (parseFloat(ethBalance) > 0.001) {
      console.log('✅ You have ETH on Polygon! You can bridge it to Base.');
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Open your browser');
      console.log('2. Go to: https://bridge.base.org');
      console.log('3. Connect MetaMask');
      console.log('4. Select: FROM Polygon → TO Base');
      console.log('5. Bridge amount:', (parseFloat(ethBalance) * 0.95).toFixed(6), 'ETH');
      console.log('6. Wait 5-10 minutes for completion\n');
    } else {
      console.log('❌ No ETH on Polygon either!');
      console.log('\n💡 OPTIONS:');
      console.log('1. Buy ETH on Base directly (use Coinbase, Binance, etc.)');
      console.log('2. Or send ETH from another wallet to Base network\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPolygon();
