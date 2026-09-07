// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library PerpTypes {
    // 仓位结构体：与前端 App.jsx 中的 positions 数据结构完美对齐
    struct Position {
        string asset;       // 资产代码，例如 "BTC", "AAPL", "00700", "GOLD" 等
        bool isLong;        // true 代表做多 (buy)，false 代表做空 (sell)
        uint256 size;       // 仓位数量（已放大相应倍数）
        uint256 entryPrice; // 开仓均价（已放大，例如放大 10^8 倍）
        uint256 leverage;   // 杠杆倍数（加密最高 30x，金融最高 10x）
        uint256 marginPaid; // 锁定的保证金（单位：USDC，通常 6 位小数）
    }

    // 订单请求结构体（用于未来从后端或前端接收参数）
    struct OrderRequest {
        string asset;
        bool isLong;
        uint256 size;
        uint256 leverage;
        uint256 margin;
    }
}