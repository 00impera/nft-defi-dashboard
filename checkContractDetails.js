import 'dotenv/config';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x82ecB5c11Eda49f8E77e8617C360A5645F8612D1';

const ABI = [
  "function owner() view returns (address)",
  "function profitWallet() view returns (address)",
  "function profitRate() view returns (uint256)",
  "function totalSupply() view returns (uint256)"
];

async function checkContract() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  
  console.log('\n🔍 CONTRACT DETAILS\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📍 Address:', CONTRACT_ADDRESS);
  console.log('🔗 BaseScan:', `https://basescan.org/address/${CONTRACT_ADDRESS}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    const owner = await contract.owner();
    console.log('👤 Owner:', owner);
    
    const profitWallet = await contract.profitWallet();
    console.log('💰 Profit Wallet:', profitWallet);
    
    const profitRate = await contract.profitRate();
    console.log('📊 Profit Rate:', profitRate.toString(), 'bps (', (Number(profitRate) / 100), '%)');
    
    const totalSupply = await contract.totalSupply();
    console.log('🎨 Total NFTs Minted:', totalSupply.toString());
    
    console.log('\n✅ Contract is working!\n');
    
  } catch (error) {
    console.error('❌ Error reading contract:', error.message);
  }
}

checkContract();
