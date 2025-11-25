// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Uniswap V2 Router interface
interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

// Aave Pool interface
interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

contract CryptoLockerDeFi is ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard, Pausable {
    // ========== NFT State ==========
    uint256 private _tokenIds;

    enum ContentType {
        IMAGE,
        VIDEO,
        AUDIO,
        TEXT,
        DOCUMENT,
        OTHER
    }

    struct NFTMetadata {
        string name;
        string description;
        ContentType contentType;
        string ipfsHash;
        string[] additionalFiles; // Support multiple files (video + image, etc.)
        uint256 collectionId;
        address creator;
        address originalOwner;
        uint256 mintedAt;
        uint256 chainId;
        bool isListed;
        uint256 price;
        string[] tags;
    }

    mapping(uint256 => NFTMetadata) public nftMetadata;
    mapping(address => uint256[]) public userNFTs;

    event NFTMinted(
        uint256 indexed tokenId, 
        address indexed creator, 
        uint256 indexed collectionId, 
        ContentType contentType,
        string metadataURI
    );
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTSold(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);

    // ========== Collection State ==========
    struct Collection {
        uint256 id;
        string name;
        string description;
        string coverImage;
        address creator;
        uint256 createdAt;
        uint256[] nftIds;
        bool isPublic;
        uint256 chainId;
    }

    uint256 private _collectionIds;
    mapping(uint256 => Collection) public collections;
    mapping(address => uint256[]) public userCollections;
    mapping(uint256 => mapping(uint256 => bool)) public nftInCollection; // collectionId => tokenId => bool

    event CollectionCreated(
        uint256 indexed collectionId, 
        string name, 
        address indexed creator,
        uint256 chainId
    );
    event NFTAddedToCollection(uint256 indexed collectionId, uint256 indexed tokenId);
    event NFTRemovedFromCollection(uint256 indexed collectionId, uint256 indexed tokenId);

    // ========== Multi-Chain Support ==========
    mapping(uint256 => bool) public supportedChains;
    
    event ChainAdded(uint256 indexed chainId);
    event ChainRemoved(uint256 indexed chainId);

    // ========== Marketplace ==========
    uint256 public platformFee = 250; // 2.5% in basis points
    address public platformWallet;
    
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool isActive;
    }
    
    mapping(uint256 => Listing) public listings;

    // ========== DeFi State ==========
    struct Lock {
        address token;
        uint256 amount;
        uint256 start;
        uint256 duration;
        bool claimed;
        uint256 profit;
        bool usingYield;
        uint256 yieldEarned;
    }

    mapping(address => Lock[]) public locks;
    address public profitWallet;
    uint256 public profitRate;
    IUniswapV2Router02 public uniswapRouter;
    IAavePool public aavePool;

    event Locked(address indexed user, address indexed token, uint256 amount, uint256 duration, uint256 lockId);
    event Unlocked(address indexed user, address indexed token, uint256 amount, uint256 profit, uint256 lockId);
    event EmergencyUnlocked(address indexed user, uint256 lockId, uint256 penalty);

    constructor(
        address _profitWallet,
        uint256 _profitRate,
        address _uniswapRouter,
        address _aavePool
    ) ERC721("CryptoLocker NFT", "CLNFT") Ownable(msg.sender) {
        profitWallet = _profitWallet;
        profitRate = _profitRate;
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
        aavePool = IAavePool(_aavePool);
        platformWallet = msg.sender;
        
        // Add current chain as supported
        supportedChains[block.chainid] = true;
        emit ChainAdded(block.chainid);
    }

    // ========== Quick NFT Minting ==========
    /**
     * @dev Mint an NFT in seconds - simplified for fast creation
     * @param _name NFT name
     * @param _description NFT description
     * @param _contentType Type of content (0=Image, 1=Video, 2=Audio, 3=Text, 4=Document, 5=Other)
     * @param _ipfsHash IPFS hash of main content
     * @param _tokenURI Token URI for metadata
     */
    function quickMintNFT(
        string memory _name,
        string memory _description,
        ContentType _contentType,
        string memory _ipfsHash,
        string memory _tokenURI
    ) external whenNotPaused returns (uint256) {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);

        string[] memory emptyArray;
        nftMetadata[newTokenId] = NFTMetadata({
            name: _name,
            description: _description,
            contentType: _contentType,
            ipfsHash: _ipfsHash,
            additionalFiles: emptyArray,
            collectionId: 0,
            creator: msg.sender,
            originalOwner: msg.sender,
            mintedAt: block.timestamp,
            chainId: block.chainid,
            isListed: false,
            price: 0,
            tags: emptyArray
        });

        userNFTs[msg.sender].push(newTokenId);

        emit NFTMinted(newTokenId, msg.sender, 0, _contentType, _tokenURI);
        return newTokenId;
    }

    /**
     * @dev Advanced NFT minting with multiple files and tags
     */
    function mintAdvancedNFT(
        string memory _name,
        string memory _description,
        ContentType _contentType,
        string memory _ipfsHash,
        string[] memory _additionalFiles,
        string[] memory _tags,
        uint256 _collectionId,
        string memory _tokenURI
    ) external whenNotPaused returns (uint256) {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);

        nftMetadata[newTokenId] = NFTMetadata({
            name: _name,
            description: _description,
            contentType: _contentType,
            ipfsHash: _ipfsHash,
            additionalFiles: _additionalFiles,
            collectionId: _collectionId,
            creator: msg.sender,
            originalOwner: msg.sender,
            mintedAt: block.timestamp,
            chainId: block.chainid,
            isListed: false,
            price: 0,
            tags: _tags
        });

        userNFTs[msg.sender].push(newTokenId);

        // Add to collection if specified
        if (_collectionId > 0 && _collectionId <= _collectionIds) {
            require(collections[_collectionId].creator == msg.sender, "Not collection owner");
            collections[_collectionId].nftIds.push(newTokenId);
            nftInCollection[_collectionId][newTokenId] = true;
            emit NFTAddedToCollection(_collectionId, newTokenId);
        }

        emit NFTMinted(newTokenId, msg.sender, _collectionId, _contentType, _tokenURI);
        return newTokenId;
    }

    // ========== Collection Management ==========
    /**
     * @dev Create a new collection
     */
    function createCollection(
        string memory _name,
        string memory _description,
        string memory _coverImage,
        bool _isPublic
    ) external returns (uint256) {
        _collectionIds++;
        uint256 newId = _collectionIds;
        
        uint256[] memory emptyNFTs;
        collections[newId] = Collection({
            id: newId,
            name: _name,
            description: _description,
            coverImage: _coverImage,
            creator: msg.sender,
            createdAt: block.timestamp,
            nftIds: emptyNFTs,
            isPublic: _isPublic,
            chainId: block.chainid
        });
        
        userCollections[msg.sender].push(newId);
        
        emit CollectionCreated(newId, _name, msg.sender, block.chainid);
        return newId;
    }

    /**
     * @dev Add existing NFT to collection
     */
    function addNFTToCollection(uint256 _collectionId, uint256 _tokenId) external {
        require(_collectionId > 0 && _collectionId <= _collectionIds, "Invalid collection");
        require(ownerOf(_tokenId) == msg.sender, "Not NFT owner");
        require(collections[_collectionId].creator == msg.sender, "Not collection owner");
        require(!nftInCollection[_collectionId][_tokenId], "Already in collection");

        collections[_collectionId].nftIds.push(_tokenId);
        nftInCollection[_collectionId][_tokenId] = true;
        nftMetadata[_tokenId].collectionId = _collectionId;

        emit NFTAddedToCollection(_collectionId, _tokenId);
    }

    /**
     * @dev Remove NFT from collection
     */
    function removeNFTFromCollection(uint256 _collectionId, uint256 _tokenId) external {
        require(collections[_collectionId].creator == msg.sender, "Not collection owner");
        require(nftInCollection[_collectionId][_tokenId], "Not in collection");

        nftInCollection[_collectionId][_tokenId] = false;
        nftMetadata[_tokenId].collectionId = 0;

        emit NFTRemovedFromCollection(_collectionId, _tokenId);
    }

    /**
     * @dev Get all NFTs in a collection
     */
    function getCollectionNFTs(uint256 _collectionId) external view returns (uint256[] memory) {
        require(_collectionId > 0 && _collectionId <= _collectionIds, "Invalid collection");
        return collections[_collectionId].nftIds;
    }

    /**
     * @dev Get all collections owned by a user
     */
    function getUserCollections(address _user) external view returns (uint256[] memory) {
        return userCollections[_user];
    }

    /**
     * @dev Get all NFTs owned by a user
     */
    function getUserNFTs(address _user) external view returns (uint256[] memory) {
        return userNFTs[_user];
    }

    // ========== Marketplace Functions ==========
    /**
     * @dev List NFT for sale
     */
    function listNFT(uint256 _tokenId, uint256 _price) external {
        require(ownerOf(_tokenId) == msg.sender, "Not NFT owner");
        require(_price > 0, "Price must be greater than 0");

        listings[_tokenId] = Listing({
            tokenId: _tokenId,
            seller: msg.sender,
            price: _price,
            isActive: true
        });

        nftMetadata[_tokenId].isListed = true;
        nftMetadata[_tokenId].price = _price;

        emit NFTListed(_tokenId, _price);
    }

    /**
     * @dev Buy listed NFT
     */
    function buyNFT(uint256 _tokenId) external payable nonReentrant {
        Listing memory listing = listings[_tokenId];
        require(listing.isActive, "NFT not listed");
        require(msg.value >= listing.price, "Insufficient payment");

        // Calculate fees
        uint256 fee = (listing.price * platformFee) / 10000;
        uint256 sellerAmount = listing.price - fee;

        // Transfer NFT
        _transfer(listing.seller, msg.sender, _tokenId);

        // Update metadata
        nftMetadata[_tokenId].isListed = false;
        nftMetadata[_tokenId].price = 0;
        listings[_tokenId].isActive = false;

        // Transfer funds
        payable(platformWallet).transfer(fee);
        payable(listing.seller).transfer(sellerAmount);

        // Refund excess
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }

        emit NFTSold(_tokenId, listing.seller, msg.sender, listing.price);
    }

    /**
     * @dev Cancel NFT listing
     */
    function cancelListing(uint256 _tokenId) external {
        require(listings[_tokenId].seller == msg.sender, "Not seller");
        
        listings[_tokenId].isActive = false;
        nftMetadata[_tokenId].isListed = false;
        nftMetadata[_tokenId].price = 0;
    }

    // ========== Multi-Chain Support ==========
    function addSupportedChain(uint256 _chainId) external onlyOwner {
        supportedChains[_chainId] = true;
        emit ChainAdded(_chainId);
    }

    function removeSupportedChain(uint256 _chainId) external onlyOwner {
        supportedChains[_chainId] = false;
        emit ChainRemoved(_chainId);
    }

    // ========== DeFi Locking Functions ==========
    function lockTokens(
        address _token,
        uint256 _amount,
        uint256 _duration,
        bool _useYield
    ) external nonReentrant whenNotPaused {
        require(_amount > 0, "Amount must be greater than 0");
        require(_duration >= 7 days, "Minimum lock period is 7 days");
        require(_duration <= 365 days, "Maximum lock period is 365 days");

        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        if (_useYield) {
            IERC20(_token).approve(address(aavePool), _amount);
            aavePool.supply(_token, _amount, address(this), 0);
        }

        locks[msg.sender].push(Lock({
            token: _token,
            amount: _amount,
            start: block.timestamp,
            duration: _duration,
            claimed: false,
            profit: 0,
            usingYield: _useYield,
            yieldEarned: 0
        }));

        emit Locked(msg.sender, _token, _amount, _duration, locks[msg.sender].length - 1);
    }

    function unlockTokens(uint256 _lockId) external nonReentrant {
        require(_lockId < locks[msg.sender].length, "Invalid lock ID");
        Lock storage lock = locks[msg.sender][_lockId];
        
        require(!lock.claimed, "Already claimed");
        require(block.timestamp >= lock.start + lock.duration, "Lock period not finished");

        uint256 profit = calculateProfit(lock.amount, lock.duration);
        lock.profit = profit;
        lock.claimed = true;

        if (lock.usingYield) {
            uint256 yieldAmount = aavePool.withdraw(lock.token, lock.amount, address(this));
            lock.yieldEarned = yieldAmount > lock.amount ? yieldAmount - lock.amount : 0;
        }

        uint256 totalAmount = lock.amount + profit + lock.yieldEarned;
        uint256 fee = (profit * profitRate) / 10000;
        
        if (fee > 0) {
            IERC20(lock.token).transfer(profitWallet, fee);
        }

        IERC20(lock.token).transfer(msg.sender, totalAmount - fee);

        emit Unlocked(msg.sender, lock.token, lock.amount, profit, _lockId);
    }

    function emergencyUnlock(uint256 _lockId) external nonReentrant {
        require(_lockId < locks[msg.sender].length, "Invalid lock ID");
        Lock storage lock = locks[msg.sender][_lockId];
        
        require(!lock.claimed, "Already claimed");
        require(block.timestamp < lock.start + lock.duration, "Lock period finished");

        lock.claimed = true;

        if (lock.usingYield) {
            aavePool.withdraw(lock.token, lock.amount, address(this));
        }

        uint256 penalty = (lock.amount * 10) / 100;
        uint256 returnAmount = lock.amount - penalty;

        IERC20(lock.token).transfer(profitWallet, penalty);
        IERC20(lock.token).transfer(msg.sender, returnAmount);

        emit EmergencyUnlocked(msg.sender, _lockId, penalty);
    }

    function calculateProfit(uint256 _amount, uint256 _duration) public pure returns (uint256) {
        uint256 apy = getAPY(_duration);
        return (_amount * apy * _duration) / (365 days * 10000);
    }

    function getAPY(uint256 _duration) public pure returns (uint256) {
        if (_duration >= 365 days) return 2000;
        if (_duration >= 180 days) return 1500;
        if (_duration >= 90 days) return 1200;
        if (_duration >= 30 days) return 800;
        return 500;
    }

    // ========== Admin Functions ==========
    function setProfitWallet(address _profitWallet) external onlyOwner {
        require(_profitWallet != address(0), "Invalid address");
        profitWallet = _profitWallet;
    }

    function setProfitRate(uint256 _profitRate) external onlyOwner {
        require(_profitRate <= 10000, "Rate too high");
        profitRate = _profitRate;
    }

    function setUniswapRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid address");
        uniswapRouter = IUniswapV2Router02(_router);
    }

    function setAavePool(address _pool) external onlyOwner {
        require(_pool != address(0), "Invalid address");
        aavePool = IAavePool(_pool);
    }

    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        platformFee = _fee;
    }

    function setPlatformWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid address");
        platformWallet = _wallet;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawEmergency(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(msg.sender, _amount);
    }

    // ========== Required Overrides ==========
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
