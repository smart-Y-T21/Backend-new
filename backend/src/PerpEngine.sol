// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PerpTypes.sol";
import "./PerpErrors.sol";

contract PerpEngine {
    string public constant name = "Hyper-BridgeLab Engine v2 (Sei Testnet)";
    
    // 散户的保证金账本（统一放大 10^6 倍，以标准 USDC 6位小数为准）
    mapping(address => uint256) public margins;
    
    // 做市商白名单
    mapping(address => bool) public isMarketMaker;
    
    // 用户仓位映射（使用 PerpTypes 中定义的 Position 结构体）
    mapping(address => PerpTypes.Position[]) public userPositions;

    event Deposit(address indexed user, uint256 amount);
    event OrderPlaced(address indexed user, string asset, bool isLong, uint256 size, uint256 price, uint256 leverage);
    event PositionClosed(address indexed user, uint256 index, int256 pnl);

    // 充值注册（测试网阶段：模拟领取测试额度 1000 USDC = 1000 * 10^6）
    function depositRegister() external {
        if (margins[msg.sender] == 0) {
            margins[msg.sender] = 1000 * 10**6;  
        }
        emit Deposit(msg.sender, margins[msg.sender]);
    }

    // 设置做市商
    function setMarketMaker(address _mm, bool _status) external {
        isMarketMaker[_mm] = _status;
    }

    // 1. 散户专用的下单接口
    function placeOrder(
        string memory _asset,
        bool _isLong,
        uint256 _size,      
        uint256 _entryPrice, 
        uint256 _leverage
    ) external {
        if (isMarketMaker[msg.sender]) revert PerpErrors.UnauthorizedMarketMaker();
        if (_leverage == 0 || _leverage > 30) revert PerpErrors.InvalidLeverage();

        // 保证金计算：(size * price) / (leverage * 放大系数)
        // 假设 size 和 entryPrice 都放大了 10^8
        uint256 marginRequired = (_size * _entryPrice) / (_leverage * 10**8);
        
        if (margins[msg.sender] < marginRequired) {
            revert PerpErrors.InsufficientMargin();
        }

        margins[msg.sender] -= marginRequired;

        userPositions[msg.sender].push(PerpTypes.Position({
            asset: _asset,
            isLong: _isLong,
            size: _size,
            entryPrice: _entryPrice,
            leverage: _leverage,
            marginPaid: marginRequired
        }));

        emit OrderPlaced(msg.sender, _asset, _isLong, _size, _entryPrice, _leverage);
    }

    // 2. 做市商机器人专用的挂单接口
    function makerPlaceOrder(
        string memory _asset,
        bool _isLong,
        uint256 _size,      
        uint256 _entryPrice, 
        uint256 _leverage
    ) external {
        if (!isMarketMaker[msg.sender]) revert PerpErrors.UnauthorizedMarketMaker();

        userPositions[msg.sender].push(PerpTypes.Position({
            asset: _asset,
            isLong: _isLong,
            size: _size,
            entryPrice: _entryPrice,
            leverage: _leverage,
            marginPaid: 0
        }));

        emit OrderPlaced(msg.sender, _asset, _isLong, _size, _entryPrice, _leverage);
    }

    // 3. 散户专用的平仓接口
    function closePosition(uint256 _index, uint256 _currentPrice) external {
        if (_index >= userPositions[msg.sender].length) {
            revert PerpErrors.InvalidPositionIndex();
        }

        PerpTypes.Position memory posToClose = userPositions[msg.sender][_index];
        
        // 计算盈亏 (PnL)
        int256 pnl = 0;
        if (posToClose.isLong) {
            if (_currentPrice > posToClose.entryPrice) {
                pnl = int256(((_currentPrice - posToClose.entryPrice) * posToClose.size) / 10**8);
            } else {
                pnl = -int256(((posToClose.entryPrice - _currentPrice) * posToClose.size) / 10**8);
            }
        } else {
            if (_currentPrice < posToClose.entryPrice) {
                pnl = int256(((posToClose.entryPrice - _currentPrice) * posToClose.size) / 10**8);
            } else {
                pnl = -int256(((_currentPrice - posToClose.entryPrice) * posToClose.size) / 10**8);
            }
        }

        // 结算最终余额 = 原始保证金 + 盈亏
        int256 finalBalanceChange = int256(posToClose.marginPaid) + pnl;
        
        if (finalBalanceChange > 0) {
            margins[msg.sender] += uint256(finalBalanceChange);
        } else {
            // 亏光清零防护（采用显式变量转换，消除编译 Warning）
            uint256 loss = uint256(-pnl);
            margins[msg.sender] = margins[msg.sender] > loss ? margins[msg.sender] - loss : 0;
        }

        // 安全删除数组成员（末位替换法）
        uint256 lastIndex = userPositions[msg.sender].length - 1;
        if (_index != lastIndex) {
            userPositions[msg.sender][_index] = userPositions[msg.sender][lastIndex];
        }
        userPositions[msg.sender].pop();

        emit PositionClosed(msg.sender, _index, pnl);
    }

    // 查询接口
    function getMargin(address _user) external view returns (uint256) {
        return margins[_user];
    }

    function getMakerPositions(address _maker) external view returns (PerpTypes.Position[] memory) {
        return userPositions[_maker];
    }
}