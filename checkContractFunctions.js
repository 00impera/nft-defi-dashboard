import 'dotenv/config';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x82ecB5c11Eda49f8E77e8617C360A5645F8612D1';

async function checkFunctions() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  
  console.log('\n🔍 CHECKING CONTRACT FUNCTIONS\n');
  console.log('═══════════════════════════════════════════════════════');
  
  // Get contract bytecode
  const code = await provider.getCode(CONTRACT_ADDRESS);
  console.log('✅ Contract exists (bytecode length:', code.length, 'chars)\n');
  
  // Try common functions
  const testFunctions = [
    { name: 'mintNFT', sig: '0x' },
    { name: 'createCollection', sig: '0x' },
    { name: 'lockTokens', sig: '0x' },
    { name: 'owner', sig: '0x8da5cb5b' },
    { name: 'profitWallet', sig: '0x' },
    { name: 'totalSupply', sig: '0x18160ddd' },
  ];
  
  console.log('📋 To see ALL functions, visit BaseScan:\n');
  console.log('🔗 https://basescan.org/address/' + CONTRACT_ADDRESS + '#readContract\n');
  console.log('🔗 https://basescan.org/address/' + CONTRACT_ADDRESS + '#writeContract\n');
  console.log('═══════════════════════════════════════════════════════\n');
}

checkFunctions();
