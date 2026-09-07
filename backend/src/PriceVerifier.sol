// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PerpErrors.sol";

contract PriceVerifier {
    // 后端签名服务器的公钥地址（后续可以改成可动态修改的 owner 或 signer 地址）
    address public priceSigner;

    constructor(address _signer) {
        priceSigner = _signer;
    }

    function setPriceSigner(address _signer) external {
        // 后续可以加上 onlyOwner 限制
        priceSigner = _signer;
    }

    /**
     * @notice 验证价格签名
     * @param asset 资产名称
     * @param price 价格（已放大）
     * @param timestamp 时间戳（防止重放攻击）
     * @param v 签名参数 v
     * @param r 签名参数 r
     * @param s 签名参数 s
     */
    function verifyPrice(
        string memory asset,
        uint256 price,
        uint256 timestamp,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public view returns (bool) {
        // 检查时间戳是否过期（例如允许 60 秒内的有效性）
        if (block.timestamp > timestamp + 60) {
            revert PerpErrors.PriceExpired();
        }

        // 构造 EIP-191 签名原文明文哈希
        bytes32 messageHash = keccak256(
            abi.encodePacked(asset, price, timestamp, block.chainid)
        );
        
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // 恢复签名者地址
        address recoveredSigner = ecrecover(ethSignedMessageHash, v, r, s);
        
        if (recoveredSigner != priceSigner || recoveredSigner == address(0)) {
            revert PerpErrors.InvalidSignature();
        }

        return true;
    }
}