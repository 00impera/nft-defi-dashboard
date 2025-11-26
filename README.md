# 🔐 CryptoLocker - NFT DeFi Platform

A decentralized platform for minting NFTs, creating collections, and locking tokens with yield generation on Base network.

## Features

- 🎨 **Quick NFT Minting** - Mint NFTs with IPFS storage via Pinata
- 📁 **Collection Creation** - Create and manage NFT collections
- 🔒 **Token Locking** - Lock tokens with optional Aave yield generation
- 🦊 **MetaMask Integration** - Connect with MetaMask wallet
- 🔑 **Web3Auth Login** - Email-based wallet generation (non-custodial)

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Web3**: Ethers.js v5.7.2
- **Network**: Base Mainnet (Chain ID: 8453)
- **Storage**: Pinata IPFS
- **Wallets**: MetaMask, Web3Auth

## Getting Started

### Prerequisites

- Modern web browser
- MetaMask extension OR any email address for Web3Auth
- ETH on Base network for transactions

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/__nft-defi-dashboard__.git
cd __nft-defi-dashboard__
```

2. Open `index.html` in your browser or use a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server
```

3. Visit `http://localhost:8000`

## Usage

### Connect Wallet

**Option 1: MetaMask**
- Click "🦊 MetaMask" button
- Approve connection
- Switch to Base network if prompted

**Option 2: Web3Auth**
- Click "🔐 Web3Auth" button
- Enter your email address
- A deterministic wallet will be generated
- Fund the wallet to start using the platform

### Mint NFT

1. Connect your wallet
2. Fill in NFT details (name, description)
3. Select content type
4. Upload file (optional)
5. Click "Mint NFT" (0.01 ETH fee)
6. Confirm transaction

### Lock Tokens

1. Enter token contract address
2. Specify amount to lock
3. Choose lock duration
4. Enable Aave yield (optional)
5. Approve token spending
6. Confirm lock transaction

## Smart Contract

- **Address**: `0x82ecB5c11Eda49f8E77e8617C360A5645F8612D1`
- **Network**: Base Mainnet
- **Explorer**: [View on BaseScan](https://basescan.org/address/0x82ecB5c11Eda49f8E77e8617C360A5645F8612D1)

## Security Notes

⚠️ **Important Security Information**:

- Web3Auth wallets are generated deterministically from email
- Same email = same wallet address
- Private keys are derived locally in browser
- No custodial control - you must fund your wallet
- Keep your email secure as it's your wallet access
- For production, implement proper key management

## Configuration

Edit `cryptolocker.js` to modify:

- Contract address
- Network settings
- Pinata API credentials (use environment variables in production)
- Fee amounts

## Browser Support

- Chrome/Brave (Recommended)
- Firefox
- Edge
- Safari (limited Web3 support)

## License

MIT License - See LICENSE file for details

## Contributing

Pull requests welcome! Please ensure your code follows the existing style.

## Support

For issues and questions, please open a GitHub issue.

---

**Disclaimer**: This is educational software. Use at your own risk. Always verify smart contract code before interacting.
