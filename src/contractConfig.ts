// frontend/src/contractConfig.ts

export const CONTRACT_ADDRESS = "0xfcdb4564c18a9134002b9771816092c9693622e3";

export const CONTRACT_ABI = [
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "Deposit",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
            { "indexed": false, "internalType": "string", "name": "asset", "type": "string" },
            { "indexed": false, "internalType": "bool", "name": "isLong", "type": "bool" },
            { "indexed": false, "internalType": "uint256", "name": "size", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "price", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "leverage", "type": "uint256" }
        ],
        "name": "OrderPlaced",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "index", "type": "uint256" }
        ],
        "name": "PositionClosed",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "depositRegister",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_index", "type": "uint256" }],
        "name": "closePosition",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "_asset", "type": "string" },
            { "internalType": "bool", "name": "_isLong", "type": "bool" },
            { "internalType": "uint256", "name": "_size", "type": "uint256" },
            { "internalType": "uint256", "name": "_entryPrice", "type": "uint256" },
            { "internalType": "uint256", "name": "_leverage", "type": "uint256" }
        ],
        "name": "placeOrder",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "_asset", "type": "string" },
            { "internalType": "bool", "name": "_isLong", "type": "bool" },
            { "internalType": "uint256", "name": "_size", "type": "uint256" },
            { "internalType": "uint256", "name": "_entryPrice", "type": "uint256" },
            { "internalType": "uint256", "name": "_leverage", "type": "uint256" }
        ],
        "name": "makerPlaceOrder",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_mm", "type": "address" },
            { "internalType": "bool", "name": "_status", "type": "bool" }
        ],
        "name": "setMarketMaker",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }],
        "name": "getMargin",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_maker", "type": "address" }
        ],
        "name": "getMakerPositions",
        "outputs": [
            {
                "components": [
                    { "internalType": "string", "name": "asset", "type": "string" },
                    { "internalType": "bool", "name": "isLong", "type": "bool" },
                    { "internalType": "uint256", "name": "size", "type": "uint256" },
                    { "internalType": "uint256", "name": "entryPrice", "type": "uint256" },
                    { "internalType": "uint256", "name": "leverage", "type": "uint256" },
                    { "internalType": "uint256", "name": "marginPaid", "type": "uint256" }
                ],
                "internalType": "struct PerpEngine.Position[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "margins",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "", "type": "address" },
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "name": "userPositions",
        "outputs": [
            { "internalType": "string", "name": "asset", "type": "string" },
            { "internalType": "bool", "name": "isLong", "type": "bool" },
            { "internalType": "uint256", "name": "size", "type": "uint256" },
            { "internalType": "uint256", "name": "entryPrice", "type": "uint256" },
            { "internalType": "uint256", "name": "leverage", "type": "uint256" },
            { "internalType": "uint256", "name": "marginPaid", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
export interface AssetConfig {
  name: string;
  price: number;
  change: number;
  up: boolean;
  category: 'Crypto' | 'Stock' | 'Forex' | 'Commodity';
}

export const INITIAL_ASSETS: AssetConfig[] = [
  // --- Crypto 类 (浅灰色背景区分) ---
  { name: 'BTC', price: 99703.1, change: 3.79, up: true, category: 'Crypto' },
  { name: 'ETH', price: 3460.6, change: -0.85, up: false, category: 'Crypto' },
  { name: 'SOL', price: 195.634, change: 4.73, up: true, category: 'Crypto' },
  { name: 'SEI', price: 0.642, change: 5.25, up: true, category: 'Crypto' },
  { name: 'SUI', price: 3.133, change: 8.74, up: true, category: 'Crypto' },
  { name: 'NEAR', price: 5.487, change: -1.36, up: false, category: 'Crypto' },
  { name: 'LINK', price: 18.17, change: 0.79, up: true, category: 'Crypto' },
  { name: 'AVAX', price: 33.961, change: 0.84, up: true, category: 'Crypto' },
  { name: 'APT', price: 11.838, change: 4.04, up: true, category: 'Crypto' },
  { name: 'OP', price: 1.802, change: -4.40, up: false, category: 'Crypto' },
  { name: 'ARB', price: 0.92, change: -1.45, up: false, category: 'Crypto' },
  { name: 'TAO', price: 598.973, change: 8.88, up: true, category: 'Crypto' },
  { name: 'BNB', price: 586.045, change: 0.12, up: true, category: 'Crypto' },
  { name: 'XRP', price: 1.168, change: 14.96, up: true, category: 'Crypto' },
  { name: 'ADA', price: 0.578, change: -1.02, up: false, category: 'Crypto' },
  
  // --- Stocks / Tech 类 (浅咖色/暖色背景区分) ---
  { name: 'HYPE', price: 28.527, change: 12.36, up: true, category: 'Stock' },
  { name: 'DOGE', price: 0.386, change: 5.95, up: true, category: 'Stock' },
  { name: 'PEPE', price: 0.00001, change: 19.88, up: true, category: 'Stock' },
  { name: 'WIF', price: 3.142, change: -2.85, up: false, category: 'Stock' },
  { name: 'BONK', price: 0.00002, change: 6.72, up: true, category: 'Stock' },
  { name: 'POPCAT', price: 1.392, change: 12.14, up: true, category: 'Stock' },
  { name: 'FLOKI', price: 0.00015, change: -4.40, up: false, category: 'Stock' },
  { name: 'SHIB', price: 0.00002, change: 0.71, up: true, category: 'Stock' }
];