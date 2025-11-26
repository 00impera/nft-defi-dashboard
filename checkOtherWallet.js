import 'dotenv/config';
import { ethers } from 'ethers';

const OTHER_WALLET = '0x592B35c8917eD36c39Ef73D0F5e92B0173560b2e';

async function checkAllNetworks() {
  console.log('\n🔍 CHECKING WALLET:', OTHER_WALLET, '\n');
  
  const networks = [
    { name: 'Base', rpc: 'https://mainnet.base.org' },
    { name: 'Polygon', rpc: 'https://polygon-rpc.com' },
    { name: 'Ethereum', rpc: 'https://eth.llamarpc.com' },
  ];

  let totalUSD = 0;

  for (const network of networks) {
    try {
      const provider = new ethers.JsonRpcProvider(network.rpc);
      const balance = await provider.getBalance(OTHER_WALLET);
      const ethBalance = parseFloat(ethers.formatEther(balance));
      const usdValue = ethBalance * 3500;
      
      if (ethBalance > 0.00001) {
        console.log(`✅ ${network.name}:`);
        console.log(`   ${ethBalance.toFixed(6)} ETH`);
        console.log(`   $${usdValue.toFixed(2)} USD\n`);
        totalUSD += usdValue;
      } else {
        console.log(`❌ ${network.name}: $0.00\n`);
      }
    } catch (error) {
      console.log(`⚠️  ${network.name}: Could not check\n`);
    }
  }

  console.log('═══════════════════════════════════');
  console.log('💰 TOTAL VALUE:', `$${totalUSD.toFixed(2)}`, 'USD');
  console.log('═══════════════════════════════════\n');
  
  if (totalUSD > 3) {
    console.log('💡 YOU HAVE ETH! You can either:');
    console.log('   1. Send 0.002 ETH from this wallet to your deployment wallet');
    console.log('   2. Or use THIS wallet to deploy instead\n');
  } else {
    console.log('❌ Not enough ETH found.\n');
  }
}

checkAllNetworks();
