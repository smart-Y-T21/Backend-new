const { task } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    seiTestnet: {
      url: "https://evm-rpc-testnet.sei-apis.com",
      accounts: ["0x6b56d5858c574af52054023d7ad3557a112b7fff80f5da8065848984b6b899b1"]
    }
  }
};