// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library PerpErrors {
    error InsufficientMargin();
    error InvalidLeverage();
    error InvalidPositionIndex();
    error UnauthorizedMarketMaker();
    error PriceExpired();
    error InvalidSignature();
}