import 'dotenv/config';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x82ecB5c11Eda49f8E77e8617C360A5645F8612D1'; // Replace with full address from ThirdWeb

async function checkContract() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  
  console.log('\n🔍 Checking contract:', CONTRACT_ADDRESS);
  
  try {
    const code = await provider.getCode(CONTRACT_ADDRESS);
    
    if (code === '0x') {
      console.log('❌ No contract found at this address!\n');
    } else {
      console.log('✅ Contract is deployed!');
      console.log('📏 Bytecode length:', code.length, 'characters');
      console.log('🔗 View on BaseScan:', `https://basescan.org/address/${CONTRACT_ADDRESS}\n`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkContract();
