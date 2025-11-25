// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
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

contract CryptoLockerDeFi is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    // ========== NFT State ==========
    uint256 private _tokenIds;

    struct NFTMetadata {
        string name;
        string description;
        string contentType;
        string ipfsHash;
        uint256 collectionId;
        address creator;
        uint256 mintedAt;
    }

    mapping(uint256 => NFTMetadata) public nftMetadata;

    event NFTMinted(uint256 indexed tokenId, address indexed creator, uint256 indexed collectionId, string metadataURI);

    // ========== Collection State ==========
    struct Collection {
        uint256 id;
        string name;
        string description;
        address creator;
        uint256 createdAt;
    }

    uint256 private _collectionIds;
    mapping(uint256 => Collection) public collections;
    mapping(address => uint256[]) public userCollections;

    event CollectionCreated(uint256 indexed collectionId, string name, address indexed creator);

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
    event YieldClaimed(address indexed user, uint256 lockId, uint256 yield);

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
    }

    // ========== NFT Minting ==========
    function mintNFT(
        string memory _name,
        string memory _description,
        string memory _contentType,
        string memory _ipfsHash,
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
            collectionId: _collectionId,
            creator: msg.sender,
            mintedAt: block.timestamp
        });

        emit NFTMinted(newTokenId, msg.sender, _collectionId, _tokenURI);
        return newTokenId;
    }

    // ========== Collection Creation ==========
    function createCollection(string memory name, string memory description) external returns (uint256) {
        _collectionIds++;
        uint256 newId = _collectionIds;
        collections[newId] = Collection({
            id: newId,
            name: name,
            description: description,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        userCollections[msg.sender].push(newId);
        emit CollectionCreated(newId, name, msg.sender);
        return newId;
    }

    // ========== DeFi Locking ==========
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
        require(block.timestamp < lock.start + lock.duration, "Lock period finished, use normal unlock");

        lock.claimed = true;

        if (lock.usingYield) {
            aavePool.withdraw(lock.token, lock.amount, address(this));
        }

        uint256 penalty = (lock.amount * 10) / 100; // 10% penalty
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
        if (_duration >= 365 days) return 2000; // 20%
        if (_duration >= 180 days) return 1500; // 15%
        if (_duration >= 90 days) return 1200;  // 12%
        if (_duration >= 30 days) return 800;   // 8%
        return 500; // 5% for 7-29 days
    }

    // ========== Admin Functions ==========
    function setProfitWallet(address _profitWallet) external onlyOwner {
        require(_profitWallet != address(0), "Invalid address");
        profitWallet = _profitWallet;
    }

    function setProfitRate(uint256 _profitRate) external onlyOwner {
        require(_profitRate <= 10000, "Rate too high"); // Max 100%
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

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawEmergency(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(msg.sender, _amount);
    }
}
