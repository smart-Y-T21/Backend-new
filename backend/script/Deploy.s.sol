// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PerpEngine.sol";

contract DeployScript is Script {
    function run() external {
        // 让它从命令行或环境变量中动态读取私钥，或者直接在这里填入你的 MetaMask 私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        new PerpEngine();

        vm.stopBroadcast();
    }
}