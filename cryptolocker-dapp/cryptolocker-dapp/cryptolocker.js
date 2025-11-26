// ===================================
// CryptoLocker DeFi Platform - Main JavaScript
// Part 2: All Logic & Smart Contract Interactions
// ===================================

// Configuration
const CONFIG = {
  CONTRACT_ADDRESS: '0x82ecB5c11Eda49f8E77e8617C360A5645F8612D1',
  BASE_CHAIN_ID: 8453,
  BASE_CHAIN_HEX: '0x2105',
  BASE_RPC: 'https://mainnet.base.org',
  CONTRACT_ABI: [
    "function mintNFT(string name, string description, string contentType, string ipfsUrl, uint256 royaltyPercent, string tokenURI) public payable returns (uint256)",
    "function createCollection(string name, string description) public returns (uint256)",
    "function lockTokens(address tokenAddress, uint256 amount, uint256 duration, bool useYield) public"
  ],
  PINATA: {
    API_KEY: 'b831f3b9a2d859df00fc',
    API_SECRET: '238033d405b10283e4a617c6238e15f8b03cafb0b37be62a0819f1f3bdab90d4',
    GATEWAY: 'gateway.pinata.cloud'
  }
};

// Global State
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let authType = null;

// ===================================
// UI Helper Functions
// ===================================

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  if (type === 'error') notification.style.borderColor = '#ff4444';
  if (type === 'success') notification.style.borderColor = '#00ff41';
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

function updateConnectionUI(connected, address = null, method = null) {
  const statusDot = document.getElementById('statusDot');
  const connectionText = document.getElementById('connectionText');
  const metamaskBtn = document.getElementById('connectMetaMask');
  const sfaBtn = document.getElementById('connectSFA');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const authMethodDiv = document.getElementById('authMethod');
  const authTypeSpan = document.getElementById('authType');
  
  if (connected && address) {
    statusDot.classList.add('connected');
    connectionText.textContent = address.slice(0, 6) + '...' + address.slice(-4);
    metamaskBtn.style.display = 'none';
    sfaBtn.style.display = 'none';
    disconnectBtn.style.display = 'block';
    authMethodDiv.style.display = 'block';
    authTypeSpan.textContent = method || 'Unknown';
  } else {
    statusDot.classList.remove('connected');
    connectionText.textContent = 'Not Connected';
    metamaskBtn.style.display = 'block';
    sfaBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
    authMethodDiv.style.display = 'none';
  }
}

function openSFAModal() {
  document.getElementById('sfaLoginModal').style.display = 'flex';
  document.getElementById('walletInfo').style.display = 'none';
}

function closeSFAModal() {
  document.getElementById('sfaLoginModal').style.display = 'none';
  document.getElementById('sfaEmail').value = '';
  document.getElementById('walletInfo').style.display = 'none';
}

// ===================================
// Network Management
// ===================================

async function checkAndSwitchNetwork() {
  try {
    const network = await provider.getNetwork();
    
    if (network.chainId !== CONFIG.BASE_CHAIN_ID) {
      showNotification('⚠️ Wrong network detected. Switching to Base...', 'info');
      await switchToBase();
      
      // Verify switch was successful
      const newNetwork = await provider.getNetwork();
      if (newNetwork.chainId !== CONFIG.BASE_CHAIN_ID) {
        throw new Error('Failed to switch to Base network');
      }
      
      showNotification('✅ Switched to Base network', 'success');
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Network switch error:', error);
    throw new Error('Please switch to Base network manually');
  }
}

async function switchToBase() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CONFIG.BASE_CHAIN_HEX }]
    });
    return true;
  } catch (error) {
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CONFIG.BASE_CHAIN_HEX,
            chainName: 'Base',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [CONFIG.BASE_RPC],
            blockExplorerUrls: ['https://basescan.org']
          }]
        });
        return true;
      } catch (addError) {
        throw new Error('Failed to add Base network');
      }
    }
    throw error;
  }
}

async function loadBalance() {
  if (!provider || !userAddress) return;
  try {
    const balance = await provider.getBalance(userAddress);
    document.getElementById('userBalance').textContent = 
      parseFloat(ethers.utils.formatEther(balance)).toFixed(4) + ' ETH';
    
    const network = await provider.getNetwork();
    document.getElementById('chainName').textContent = 
      network.chainId === CONFIG.BASE_CHAIN_ID ? 'Base ✓' : 'Wrong Network';
  } catch (error) {
    console.error('Balance error:', error);
  }
}

// ===================================
// Pinata IPFS Upload Functions
// ===================================

async function uploadFileToPinata(file) {
  try {
    showNotification('📤 Uploading file to IPFS via Pinata...');
    
    const formData = new FormData();
    formData.append('file', file);
    
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        uploadedBy: 'CryptoLocker',
        timestamp: Date.now()
      }
    });
    formData.append('pinataMetadata', metadata);
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': CONFIG.PINATA.API_KEY,
        'pinata_secret_api_key': CONFIG.PINATA.API_SECRET
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Pinata upload failed');
    }
    
    const result = await response.json();
    showNotification(`✅ File uploaded: ${result.IpfsHash}`, 'success');
    return `ipfs://${result.IpfsHash}`;
    
  } catch (error) {
    console.error('Pinata upload error:', error);
    throw new Error('Failed to upload to IPFS: ' + error.message);
  }
}

async function uploadMetadataToPinata(metadata) {
  try {
    showNotification('📤 Uploading metadata to IPFS...');
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': CONFIG.PINATA.API_KEY,
        'pinata_secret_api_key': CONFIG.PINATA.API_SECRET
      },
      body: JSON.stringify(metadata)
    });
    
    if (!response.ok) {
      throw new Error('Metadata upload failed');
    }
    
    const result = await response.json();
    showNotification(`✅ Metadata uploaded: ${result.IpfsHash}`, 'success');
    return `ipfs://${result.IpfsHash}`;
    
  } catch (error) {
    console.error('Metadata upload error:', error);
    throw new Error('Failed to upload metadata: ' + error.message);
  }
}

// ===================================
// Wallet Connection Functions
// ===================================

async function connectMetaMask() {
  if (typeof window.ethereum === 'undefined') {
    showNotification('⚠️ MetaMask not installed!', 'error');
    return;
  }

  try {
    showNotification('🔄 Connecting to MetaMask...');
    
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    authType = 'MetaMask 🦊';
    
    await switchToBase();
    
    contract = new ethers.Contract(
      CONFIG.CONTRACT_ADDRESS,
      CONFIG.CONTRACT_ABI,
      signer
    );
    
    updateConnectionUI(true, userAddress, 'MetaMask 🦊');
    showNotification('✅ MetaMask Connected!', 'success');
    
    await loadBalance();
    
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', () => window.location.reload());
    
  } catch (error) {
    console.error('MetaMask connection error:', error);
    showNotification('❌ Connection failed: ' + error.message, 'error');
    updateConnectionUI(false);
  }
}

async function loginWithSFA() {
  const email = document.getElementById('sfaEmail').value;
  if (!email) {
    showNotification('⚠️ Please enter an email', 'error');
    return;
  }

  try {
    showNotification('🔄 Generating wallet with Web3Auth...');
    
    // Generate deterministic wallet from email
    const emailHash = ethers.utils.id(email);
    const wallet = new ethers.Wallet(emailHash);
    
    provider = new ethers.providers.JsonRpcProvider(CONFIG.BASE_RPC);
    signer = wallet.connect(provider);
    userAddress = wallet.address;
    authType = 'Web3Auth 🔑';
    
    contract = new ethers.Contract(
      CONFIG.CONTRACT_ADDRESS,
      CONFIG.CONTRACT_ABI,
      signer
    );
    
    // Check if this is a returning user
    const storedWallets = JSON.parse(localStorage.getItem('sfaWallets') || '{}');
    const isReturning = storedWallets[email];
    
    // Store wallet info
    storedWallets[email] = {
      address: userAddress,
      lastLogin: Date.now()
    };
    localStorage.setItem('sfaWallets', JSON.stringify(storedWallets));
    
    // Get balance
    const balance = await provider.getBalance(userAddress);
    const balanceEth = parseFloat(ethers.utils.formatEther(balance)).toFixed(4);
    
    // Show wallet info in modal
    const walletInfo = document.getElementById('walletInfo');
    const walletMessage = document.getElementById('walletMessage');
    const walletAddress = document.getElementById('walletAddress');
    const walletBalance = document.getElementById('walletBalance');
    
    walletInfo.style.display = 'block';
    
    if (isReturning) {
      walletMessage.textContent = '✅ Welcome back!';
    } else {
      walletMessage.textContent = '🎉 New wallet created!';
    }
    
    walletAddress.textContent = `Address: ${userAddress}`;
    walletBalance.textContent = `Balance: ${balanceEth} ETH`;
    
    if (parseFloat(balanceEth) === 0) {
      walletBalance.innerHTML += '<br/>⚠️ Fund this wallet to use the platform';
    }
    
    updateConnectionUI(true, userAddress, 'Web3Auth 🔑');
    showNotification(`✅ Web3Auth Wallet ${isReturning ? 'Restored' : 'Created'}!`, 'success');
    
    await loadBalance();
    
    // Auto-close modal after 5 seconds
    setTimeout(closeSFAModal, 5000);
    
  } catch (error) {
    console.error('SFA login error:', error);
    showNotification('❌ Login failed: ' + error.message, 'error');
    updateConnectionUI(false);
  }
}

async function disconnect() {
  try {
    provider = null;
    signer = null;
    contract = null;
    userAddress = null;
    authType = null;
    
    updateConnectionUI(false);
    showNotification('👋 Disconnected', 'info');
    
  } catch (error) {
    console.error('Disconnect error:', error);
  }
}

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    showNotification('Please connect to MetaMask', 'error');
    updateConnectionUI(false);
    window.location.reload();
  } else {
    userAddress = accounts[0];
    updateConnectionUI(true, userAddress, 'MetaMask 🦊');
    loadBalance();
  }
}

// ===================================
// Smart Contract Functions
// ===================================

async function mintNFT(name, description, contentType, file) {
  if (!contract) {
    showNotification('⚠️ Please connect wallet first!', 'error');
    return;
  }

  try {
    // Check and switch network FIRST
    await checkAndSwitchNetwork();
    
    // Step 1: Upload file to IPFS (if provided)
    let ipfsUrl = "";
    if (file) {
      ipfsUrl = await uploadFileToPinata(file);
    }
    
    // Step 2: Create and upload metadata
    const metadata = {
      name: name,
      description: description,
      image: ipfsUrl,
      attributes: [
        { trait_type: "Content Type", value: contentType },
        { trait_type: "Created", value: new Date().toISOString() }
      ]
    };
    
    const tokenURI = await uploadMetadataToPinata(metadata);
    
    // Step 3: Mint NFT on blockchain
    showNotification('🔄 Minting NFT on Base...');
    const mintFee = ethers.utils.parseEther("0.01");

    const tx = await contract.mintNFT(
      name,
      description,
      contentType,
      ipfsUrl,
      0,
      tokenURI,
      { value: mintFee }
    );

    showNotification('⏳ Transaction sent! Waiting for confirmation...');
    const receipt = await tx.wait();
    
    showNotification('✅ NFT Minted Successfully! TX: ' + receipt.transactionHash.slice(0, 10) + '...', 'success');
    
    document.getElementById('quickMintForm').reset();
    await loadBalance();
    
  } catch (error) {
    console.error('Mint error:', error);
    const errorMsg = error.reason || error.data?.message || error.message;
    showNotification('❌ Mint failed: ' + errorMsg, 'error');
  }
}

async function createCollection(name, description) {
  if (!contract) {
    showNotification('⚠️ Please connect wallet first!', 'error');
    return;
  }

  try {
    // Check and switch network FIRST
    await checkAndSwitchNetwork();
    
    showNotification('🔄 Creating collection...');
    const tx = await contract.createCollection(name, description);
    
    showNotification('⏳ Transaction sent! Waiting for confirmation...');
    await tx.wait();
    
    showNotification('✅ Collection Created!', 'success');
    document.getElementById('createCollectionForm').reset();
    
  } catch (error) {
    console.error('Collection error:', error);
    const errorMsg = error.reason || error.data?.message || error.message;
    showNotification('❌ Failed: ' + errorMsg, 'error');
  }
}

async function lockTokens(tokenAddress, amount, duration, useYield) {
  if (!contract) {
    showNotification('⚠️ Please connect wallet first!', 'error');
    return;
  }

  try {
    // Check and switch network FIRST
    await checkAndSwitchNetwork();
    
    // Validate inputs
    if (!ethers.utils.isAddress(tokenAddress)) {
      showNotification('❌ Invalid token address', 'error');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      showNotification('❌ Amount must be greater than 0', 'error');
      return;
    }
    
    showNotification('🔍 Checking token details...');
    
    // Get token contract
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ],
      signer
    );
    
    // Get token info
    let tokenSymbol, tokenDecimals;
    try {
      tokenSymbol = await tokenContract.symbol();
      tokenDecimals = await tokenContract.decimals();
      showNotification(`✅ Found: ${tokenSymbol} (${tokenDecimals} decimals)`);
    } catch (error) {
      showNotification('❌ Failed to read token details. Invalid token?', 'error');
      return;
    }
    
    // Check balance
    const balance = await tokenContract.balanceOf(userAddress);
    const amountWei = ethers.utils.parseUnits(amount.toString(), tokenDecimals);
    
    if (balance.lt(amountWei)) {
      const formattedBalance = ethers.utils.formatUnits(balance, tokenDecimals);
      showNotification(`❌ Insufficient balance. You have: ${formattedBalance} ${tokenSymbol}`, 'error');
      return;
    }
    
    showNotification(`✅ Balance: ${ethers.utils.formatUnits(balance, tokenDecimals)} ${tokenSymbol}`);
    
    // Check and handle approval
    const currentAllowance = await tokenContract.allowance(userAddress, CONFIG.CONTRACT_ADDRESS);
    
    if (currentAllowance.lt(amountWei)) {
      showNotification(`🔓 Approving ${tokenSymbol}...`);
      
      // Some tokens (like USDT) require resetting allowance to 0 first
      if (currentAllowance.gt(0)) {
        const resetTx = await tokenContract.approve(CONFIG.CONTRACT_ADDRESS, 0);
        await resetTx.wait();
        showNotification('🔄 Resetting allowance...');
      }
      
      const approveTx = await tokenContract.approve(CONFIG.CONTRACT_ADDRESS, amountWei);
      showNotification('⏳ Waiting for approval...');
      await approveTx.wait();
      showNotification(`✅ ${tokenSymbol} approved!`, 'success');
    } else {
      showNotification(`✅ ${tokenSymbol} already approved`);
    }
    
    // Lock tokens
    const durationDays = Math.floor(duration / 86400);
    showNotification(`🔒 Locking ${amount} ${tokenSymbol} for ${durationDays} days...`);
    
    const lockTx = await contract.lockTokens(tokenAddress, amountWei, duration, useYield);
    showNotification('⏳ Transaction sent! Waiting for confirmation...');
    await lockTx.wait();
    
    const yieldMsg = useYield ? ' with Aave yield 📈' : '';
    showNotification(`✅ Locked ${amount} ${tokenSymbol} for ${durationDays} days${yieldMsg}`, 'success');
    
    document.getElementById('lockForm').reset();
    
  } catch (error) {
    console.error('Lock error:', error);
    
    let errorMsg = 'Unknown error';
    if (error.code === 4001) {
      errorMsg = 'Transaction rejected by user';
    } else if (error.code === -32000) {
      errorMsg = 'Insufficient ETH for gas fees';
    } else if (error.message.includes('approve')) {
      errorMsg = 'Token approval failed - try again';
    } else {
      errorMsg = error.reason || error.data?.message || error.message;
    }
    
    showNotification('❌ Failed: ' + errorMsg, 'error');
  }
}

// ===================================
// Event Listeners
// ===================================

window.addEventListener('load', () => {
  document.getElementById('connectMetaMask').addEventListener('click', connectMetaMask);
  document.getElementById('connectSFA').addEventListener('click', openSFAModal);
  document.getElementById('disconnectBtn').addEventListener('click', disconnect);

  document.getElementById('quickMintForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('nftName').value;
    const description = document.getElementById('nftDescription').value;
    const contentType = document.getElementById('contentType').value;
    const file = document.getElementById('nftFile').files[0];
    await mintNFT(name, description, contentType, file);
  });

  document.getElementById('createCollectionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('collectionName').value;
    const description = document.getElementById('collectionDescription').value;
    await createCollection(name, description);
  });

  document.getElementById('lockForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tokenAddress = document.getElementById('tokenAddress').value;
    const amount = document.getElementById('lockAmount').value;
    const duration = parseInt(document.getElementById('lockDuration').value) * 86400;
    const useYield = document.getElementById('useYield').checked;
    await lockTokens(tokenAddress, amount, duration, useYield);
  });
});
