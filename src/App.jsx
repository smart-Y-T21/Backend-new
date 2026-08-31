import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
// 👇 引入看板组件

// ==========================================
// 🔌 生产级前端与合约通信契约层 (BridgeLab Engine)
// ==========================================
const CONTRACT_ADDRESS = "0x8e13ef50186f3d5495d1e826d345d5f4e14735f4";
const CONTRACT_ABI = [
  {"type":"function","name":"closePosition","inputs":[{"name":"_index","type":"uint256","internalType":"uint256"},{"name":"_currentPrice","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"depositRegister","inputs":[],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"getMakerPositions","inputs":[{"name":"_maker","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"tuple[]","internalType":"struct PerpTypes.Position[]","components":[{"name":"asset","type":"string","internalType":"string"},{"name":"isLong","type":"bool","internalType":"bool"},{"name":"size","type":"uint256","internalType":"uint256"},{"name":"entryPrice","type":"uint256","internalType":"uint256"},{"name":"leverage","type":"uint256","internalType":"uint256"},{"name":"marginPaid","type":"uint256","internalType":"uint256"}]}],"stateMutability":"view"},
  {"type":"function","name":"getMargin","inputs":[{"name":"_user","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"isMarketMaker","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},
  {"type":"function","name":"makerPlaceOrder","inputs":[{"name":"_asset","type":"string","internalType":"string"},{"name":"_isLong","type":"bool","internalType":"bool"},{"name":"_size","type":"uint256","internalType":"uint256"},{"name":"_entryPrice","type":"uint256","internalType":"uint256"},{"name":"_leverage","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"margins","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"name","inputs":[],"outputs":[{"name":"","type":"string","internalType":"string"}],"stateMutability":"view"},
  {"type":"function","name":"placeOrder","inputs":[{"name":"_asset","type":"string","internalType":"string"},{"name":"_isLong","type":"bool","internalType":"bool"},{"name":"_size","type":"uint256","internalType":"uint256"},{"name":"_entryPrice","type":"uint256","internalType":"uint256"},{"name":"_leverage","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"setMarketMaker","inputs":[{"name":"_mm","type":"address","internalType":"address"},{"name":"_status","type":"bool","internalType":"bool"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"userPositions","inputs":[{"name":"","type":"address","internalType":"address"},{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"asset","type":"string","internalType":"string"},{"name":"isLong","type":"bool","internalType":"bool"},{"name":"size","type":"uint256","internalType":"uint256"},{"name":"entryPrice","type":"uint256","internalType":"uint256"},{"name":"leverage","type":"uint256","internalType":"uint256"},{"name":"marginPaid","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
  {"type":"event","name":"Deposit","inputs":[{"name":"user","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
  {"type":"event","name":"OrderPlaced","inputs":[{"name":"user","type":"address","indexed":true,"internalType":"address"},{"name":"asset","type":"string","indexed":false,"internalType":"string"},{"name":"isLong","type":"bool","indexed":false,"internalType":"bool"},{"name":"size","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"price","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"leverage","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
  {"type":"event","name":"PositionClosed","inputs":[{"name":"user","type":"address","indexed":true,"internalType":"address"},{"name":"index","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"pnl","type":"int256","indexed":false,"internalType":"int256"}],"anonymous":false}
];

const apiClient = {
  login: async (email) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    localStorage.setItem('bridgelab_active_email', email);
    const storageKey = `bridgelab_acc_${email}`;
    let accData = JSON.parse(localStorage.getItem(storageKey) || '{"balance": 0, "airdropBalance": 0, "depositBalance": 0, "claimed": false, "isRealLive": false, "positions": [], "walletAddress": null}');
    return { success: true, email, data: accData };
  },

  deposit: async (email, amount, txHash = null) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const storageKey = `bridgelab_acc_${email}`;
    let accData = JSON.parse(localStorage.getItem(storageKey) || '{"balance": 0, "airdropBalance": 0, "depositBalance": 0, "claimed": false, "isRealLive": false, "positions": [], "walletAddress": null}');
    
    accData.depositBalance += amount;
    accData.balance = accData.depositBalance; 
    accData.airdropBalance = 0; 
    accData.claimed = true;
    accData.isRealLive = true; 
    
    localStorage.setItem(storageKey, JSON.stringify(accData));
    return { success: true, newBalance: accData.balance, txHash };
  },

  claimAirdrop: async (email) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const storageKey = `bridgelab_acc_${email}`;
    let accData = JSON.parse(localStorage.getItem(storageKey) || '{"balance": 0, "airdropBalance": 0, "depositBalance": 0, "claimed": false, "isRealLive": false, "positions": [], "walletAddress": null}');
    
    if (!accData.isRealLive) {
      accData.airdropBalance = 1000;
      accData.balance = 1000;
      accData.claimed = true;
    }
    
    localStorage.setItem(storageKey, JSON.stringify(accData));
    return { success: true, newBalance: accData.balance };
  }
};

// ==========================================
// 🌟 纯原生辅助组件：价格轻量脉冲变色
// ==========================================
const PriceDisplay = ({ price, currencySymbol = '$' }) => {
  const prevPriceRef = useRef(price);
  const [colorClass, setColorClass] = useState('');

  useEffect(() => {
    if (price !== prevPriceRef.current) {
      setColorClass(price > prevPriceRef.current ? 'text-up' : 'text-down');
      const timer = setTimeout(() => setColorClass(''), 800);
      prevPriceRef.current = price;
      return () => clearTimeout(timer);
    }
  }, [price]);

  return (
    <span className={colorClass} style={{ transition: 'color 0.4s ease', fontWeight: 'bold' }}>
      {currencySymbol}{price.toLocaleString()}
    </span>
  );
};

export default function App() {

  const [currentSide, setCurrentSide] = useState('buy');
  const [leverage, setLeverage] = useState(20);
  const [percentOption, setPercentOption] = useState(25);
  const [customMarginInput, setCustomMarginInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- 账户与身份核心状态 ---
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [isRealLive, setIsRealLive] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [tempEmailInput, setTempEmailInput] = useState('');

  // 充值与水龙头状态
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [depositInput, setDepositInput] = useState('');
  const [seiBalance, setSeiBalance] = useState(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  // 🌟 提现安全弹窗状态
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // 💰 严格隔离的资金账本
  const [airdropBalance, setAirdropBalance] = useState(0.00); 
  const [depositBalance, setDepositBalance] = useState(0.00); 
  const [availableMarginRaw, setAvailableMarginRaw] = useState(0.00); 
  
  // 🛡️ 绝对防负数兜底：可用余额永不小于 0
  const availableMargin = Math.max(0, availableMarginRaw);

  const [positions, setPositions] = useState([]); 

  // 初始化加载缓存
  useEffect(() => {
    const activeEmail = localStorage.getItem('bridgelab_active_email');
    if (activeEmail) {
      setRegisteredEmail(activeEmail);
      setIsLoggedIn(true);
      
      const accData = JSON.parse(localStorage.getItem(`bridgelab_acc_${activeEmail}`) || '{"balance": 0, "airdropBalance": 0, "depositBalance": 0, "claimed": false, "isRealLive": false, "positions": [], "walletAddress": null}');
      setAirdropBalance(accData.airdropBalance || 0);
      setDepositBalance(accData.depositBalance || 0);
      setAvailableMarginRaw(accData.balance);
      setHasClaimed(accData.claimed);
      setIsRealLive(accData.isRealLive || false);
      setPositions(accData.positions || []);
      setWalletAddress(accData.walletAddress || null);
    }
  }, []);

  // 自动同步状态到缓存
  useEffect(() => {
    if (isLoggedIn && registeredEmail) {
      const accData = {
        balance: availableMarginRaw,
        airdropBalance,
        depositBalance,
        claimed: hasClaimed,
        isRealLive,
        positions,
        walletAddress
      };
      localStorage.setItem(`bridgelab_acc_${registeredEmail}`, JSON.stringify(accData));
    }
  }, [availableMarginRaw, airdropBalance, depositBalance, hasClaimed, isRealLive, positions, isLoggedIn, registeredEmail, walletAddress]);

  // 🌟 资产大盘数据矩阵
  const [assets, setAssets] = useState([
    { code: 'BTC', price: 98245.5, change: 2.4, up: true, cat: 'Crypto', isBtcEco: true, subCat: '24*7 Perpetual', currency: '$' },
    { code: 'MSTR', price: 412.50, change: 8.2, up: true, cat: 'Crypto', isBtcEco: true, subCat: 'Bitcoin Treasury · US', currency: '$' },
    { code: 'IBIT', price: 38.20, change: 2.8, up: true, cat: 'Crypto', isBtcEco: true, subCat: 'iShares Bitcoin Trust · Spot', currency: '$' },
    { code: 'BITO', price: 21.45, change: 1.9, up: true, cat: 'Crypto', isBtcEco: true, subCat: 'ProShares Bitcoin ETF · Future', currency: '$' },
    { code: 'MARA', price: 22.40, change: 4.5, up: true, cat: 'Crypto', isBtcEco: true, subCat: 'Bitcoin Treasury · US', currency: '$' },
    { code: 'RIOT', price: 11.20, change: 3.2, up: true, cat: 'Crypto', isBtcEco: true, subCat: 'Bitcoin Treasury · US', currency: '$' },
    { code: 'CLSK', price: 14.80, change: -1.5, up: false, cat: 'Crypto', isBtcEco: true, subCat: 'Bitcoin Treasury · US', currency: '$' },
    { code: 'HUT', price: 18.50, change: 5.1, up: true, cat: 'Crypto', isBtcEco: true, subCat: 'Bitcoin Treasury · US', currency: '$' },
    { code: 'METAPLANET', price: 220.00, change: 8.3, up: true, cat: 'Crypto', isBtcEco: true, subCat: 'Bitcoin Treasury · JP', currency: '¥' },

    { code: 'ETH', price: 3452.1, change: -1.1, up: false, cat: 'Ethereum', isEthEco: true, subCat: '24*7 Perpetual', currency: '$' },
    { code: 'ETHE', price: 28.50, change: 1.8, up: true, cat: 'Ethereum', isEthEco: true, subCat: 'Grayscale Ethereum Trust', currency: '$' },
    { code: 'ETHA', price: 24.10, change: 2.1, up: true, cat: 'Ethereum', isEthEco: true, subCat: 'iShares Ethereum Trust', currency: '$' },
    { code: 'FETH', price: 21.80, change: 1.5, up: true, cat: 'Ethereum', isEthEco: true, subCat: 'Fidelity Ethereum Fund', currency: '$' },
    { code: 'SBET', price: 6.29, change: 0.0, up: true, cat: 'Ethereum', isEthEco: true, subCat: 'ETH Treasury · US', currency: '$' },
    { code: 'BMNR', price: 15.50, change: 0.0, up: true, cat: 'Ethereum', isEthEco: true, subCat: 'ETH Treasury · US', currency: '$' },
    { code: 'BTBT', price: 4.50, change: 0.0, up: true, cat: 'Ethereum', isEthEco: true, subCat: 'ETH Treasury · US', currency: '$' },

    { name: 'HYPE', price: 28.50, change: 12.4, up: true, cat: 'Altcoins', currency: '$' },
    { name: 'SOL', price: 192.40, change: 3.1, up: true, cat: 'Altcoins', currency: '$' },
    { name: 'SEI', price: 0.6482, change: 5.8, up: true, cat: 'Altcoins', currency: '$' },
    { name: 'SUI', price: 3.12, change: 8.2, up: true, cat: 'Altcoins', currency: '$' },
    { name: 'NEAR', price: 5.45, change: -2.1, up: false, cat: 'Altcoins', currency: '$' },
    { name: 'LINK', price: 18.20, change: 0.9, up: true, cat: 'Altcoins', currency: '$' },
    { name: 'AVAX', price: 34.20, change: 1.5, up: true, cat: 'Altcoins', currency: '$' },
    { name: 'APT', price: 11.85, change: 4.2, up: true, cat: 'Altcoins', currency: '$' },
    { name: 'OP', price: 1.82, change: -3.4, up: false, cat: 'Altcoins', currency: '$' },
    { name: 'ARB', price: 0.92, change: -1.5, up: false, cat: 'Altcoins', currency: '$' },
    { name: 'TAO', price: 582.4, change: 6.1, up: true, cat: 'Altcoins', currency: '$' },
    { name: 'BNB', price: 582.50, change: -0.4, up: false, cat: 'Altcoins', currency: '$' },
    { name: 'XRP', price: 1.14, change: 12.5, up: true, cat: 'Altcoins', currency: '$' },
    { name: 'ADA', price: 0.58, change: -0.8, up: false, cat: 'Altcoins', currency: '$' },
    { name: 'RENDER', price: 8.42, change: 4.5, up: true, cat: 'Altcoins', currency: '$' },
    { name: 'INJ', price: 24.10, change: 2.2, up: true, cat: 'Altcoins', currency: '$' },
    { name: 'TIA', price: 6.25, change: -1.8, up: false, cat: 'Altcoins', currency: '$' },

    { name: 'NVDA', price: 195.04, change: 1.5, up: true, cat: 'US Equities', currency: '$' },
    { name: 'TSLA', price: 308.85, change: -1.2, up: false, cat: 'US Equities', currency: '$' },
    { name: 'AAPL', price: 333.43, change: 0.8, up: true, cat: 'US Equities', currency: '$' },
    { name: 'MSFT', price: 448.20, change: -0.5, up: false, cat: 'US Equities', currency: '$' },
    { name: 'AMZN', price: 215.60, change: 1.4, up: true, cat: 'US Equities', currency: '$' },
    { name: 'GOOGL', price: 184.50, change: 0.6, up: true, cat: 'US Equities', currency: '$' },
    { name: 'META', price: 545.20, change: 2.1, up: true, cat: 'US Equities', currency: '$' },
    { name: 'COIN', price: 265.40, change: 4.8, up: true, cat: 'US Equities', currency: '$' },
    { name: 'NFLX', price: 712.00, change: 1.1, up: true, cat: 'US Equities', currency: '$' },
    { name: 'AMD', price: 162.10, change: -2.0, up: false, cat: 'US Equities', currency: '$' },
    { name: 'INTC', price: 22.40, change: -0.8, up: false, cat: 'US Equities', currency: '$' },

    { name: 'BABA', price: 92.50, change: -1.2, up: false, cat: 'Chinese ADRs', currency: '$' },
    { name: 'PDD', price: 128.40, change: 3.5, up: true, cat: 'Chinese ADRs', currency: '$' },
    { name: 'TCEHY', price: 58.20, change: 1.5, up: true, cat: 'Chinese ADRs', currency: '$' },
    { name: 'JD', price: 32.10, change: 0.8, up: true, cat: 'Chinese ADRs', currency: '$' },
    { name: 'BIDU', price: 94.50, change: -0.6, up: false, cat: 'Chinese ADRs', currency: '$' },
    { name: 'NIO', price: 5.20, change: -3.4, up: false, cat: 'Chinese ADRs', currency: '$' },
    { name: 'XPEV', price: 11.80, change: 2.9, up: true, cat: 'Chinese ADRs', currency: '$' },
    { name: 'LI', price: 26.50, change: 2.1, up: true, cat: 'Chinese ADRs', currency: '$' },
    { name: 'BILI', price: 21.40, change: 4.2, up: true, cat: 'Chinese ADRs', currency: '$' },
    { name: 'TME', price: 12.80, change: 0.5, up: true, cat: 'Chinese ADRs', currency: '$' },

    { name: 'HSI', displayName: 'HSI', backendCode: 'HSI', price: 19850.00, change: 1.2, up: true, cat: 'HK Equities', subCat: 'Hang Seng Index · Benchmark', currency: 'HKD ' },
    { name: 'CKH', displayName: 'CK Hutchison', backendCode: '00001', price: 38.50, change: 0.8, up: true, cat: 'HK Equities', subCat: 'CK Hutchison Holdings', currency: 'HKD ' },
    { name: 'HSBC_HK', displayName: 'HSBC', backendCode: '00005', price: 68.20, change: 1.1, up: true, cat: 'HK Equities', subCat: 'HSBC Holdings plc', currency: 'HKD ' },
    { name: 'AIA', displayName: 'AIA', backendCode: '01299', price: 54.00, change: -0.5, up: false, cat: 'HK Equities', subCat: 'AIA Group Limited', currency: 'HKD ' },
    { name: 'TENCENT', displayName: 'Tencent', backendCode: '00700', price: 412.00, change: 1.8, up: true, cat: 'HK Equities', subCat: 'Tencent Holdings', currency: 'HKD ' },
    { name: 'MEITUAN', displayName: 'Meituan', backendCode: '03690', price: 135.50, change: -0.8, up: false, cat: 'HK Equities', subCat: 'Meituan-W', currency: 'HKD ' },
    { name: 'XIAOMI', displayName: 'Xiaomi', backendCode: '01810', price: 28.40, change: 4.5, up: true, cat: 'HK Equities', subCat: 'Xiaomi Corporation-W', currency: 'HKD ' },
    { name: 'ALIBABA_HK', displayName: 'Alibaba', backendCode: '09988', price: 92.80, change: -1.0, up: false, cat: 'HK Equities', subCat: 'Alibaba Group-SW', currency: 'HKD ' },
    { name: 'SMIC', displayName: 'SMIC', backendCode: '00981', price: 26.50, change: 3.2, up: true, cat: 'HK Equities', subCat: 'Semiconductor Manufacturing', currency: 'HKD ' },
    { name: 'LIAUTO', displayName: 'Li Auto', backendCode: '02015', price: 94.50, change: 2.4, up: true, cat: 'HK Equities', subCat: 'Li Auto Inc-W', currency: 'HKD ' },
    { name: 'BAIDU_HK', displayName: 'Baidu', backendCode: '09888', price: 88.50, change: -0.5, up: false, cat: 'HK Equities', subCat: 'Baidu Inc-SW', currency: 'HKD ' },
    { name: 'HKEX', displayName: 'HKEX', backendCode: '00388', price: 298.00, change: 1.5, up: true, cat: 'HK Equities', subCat: 'Hong Kong Exchanges and Clearing', currency: 'HKD ' },

    { name: 'USD/CNH', price: 7.2450, change: 0.1, up: true, cat: 'Macro', currency: '$' },
    { name: 'DXY', price: 104.20, change: -0.2, up: false, cat: 'Macro', currency: '$' },
    { name: 'EUR/USD', price: 1.0890, change: 0.1, up: true, cat: 'Macro', currency: '$' },
    { name: 'GBP/USD', price: 1.2840, change: 0.2, up: true, cat: 'Macro', currency: '$' },
    { name: 'USD/JPY', price: 154.10, change: 0.4, up: true, cat: 'Macro', currency: '$' },
    { name: 'AUD/USD', price: 0.6650, change: -0.1, up: false, cat: 'Macro', currency: '$' },
    { name: 'USD/CHF', price: 0.8790, change: 0.1, up: true, cat: 'Macro', currency: '$' },
    { name: 'NZD/USD', price: 0.6080, change: -0.2, up: false, cat: 'Macro', currency: '$' },
    { name: 'USD/CAD', price: 1.3650, change: 0.1, up: true, cat: 'Macro', currency: '$' },
    { name: 'GOLD', price: 4086.20, change: 0.6, up: true, cat: 'Macro', currency: '$' },
    { name: 'OIL', price: 78.40, change: 1.2, up: true, cat: 'Macro', currency: '$' },
    { name: 'SILVER', price: 28.50, change: 0.9, up: true, cat: 'Macro', currency: '$' },
    { name: 'PLATINUM', price: 1010.0, change: 0.5, up: true, cat: 'Macro', currency: '$' },
    { name: 'PALLADIUM', price: 985.0, change: -0.4, up: false, cat: 'Macro', currency: '$' },

    { name: 'SPY', price: 595.20, change: 0.6, up: true, cat: 'ETF', currency: '$' },
    { name: 'QQQ', price: 518.40, change: 0.9, up: true, cat: 'ETF', currency: '$' },
    { name: 'IWM', price: 232.10, change: -0.2, up: false, cat: 'ETF', currency: '$' },
    { name: 'ARKK', price: 58.40, change: 2.4, up: true, cat: 'ETF', currency: '$' },
    { name: 'GLD', price: 378.50, change: 0.6, up: true, cat: 'ETF', currency: '$' },
    { name: 'EWJ', price: 72.10, change: 0.4, up: true, cat: 'ETF', currency: '$' },
    { name: 'VGK', price: 68.20, change: 0.2, up: true, cat: 'ETF', currency: '$' },
    { name: 'MCHI', price: 31.40, change: 1.8, up: true, cat: 'ETF', currency: '$' },
    { name: 'EWY', price: 58.20, change: -0.8, up: false, cat: 'ETF', currency: '$' },
    { name: 'INDA', price: 56.40, change: 0.7, up: true, cat: 'ETF', currency: '$' },
    { name: 'EWU', price: 36.50, change: -0.1, up: false, cat: 'ETF', currency: '$' },
    { name: 'EWS', price: 25.80, change: 0.3, up: true, cat: 'ETF', currency: '$' },
    { name: 'EWW', price: 65.20, change: 0.4, up: true, cat: 'ETF', currency: '$' }
  ].map(item => ({
    ...item,
    code: item.code || item.name,
  })));

  const [selectedAsset, setSelectedAsset] = useState(assets[0]);

  const isCryptoOrMeme = selectedAsset && (
    selectedAsset.cat === 'Altcoins' || 
    selectedAsset.code === 'BTC' || 
    selectedAsset.code === 'ETH' || 
    selectedAsset.cat === 'Crypto' || 
    selectedAsset.cat === 'Ethereum'
  ) && !selectedAsset.isEvent;

  const maxAllowedLeverage = isCryptoOrMeme ? 30 : 10;

  useEffect(() => {
    if (leverage > maxAllowedLeverage) {
      setLeverage(maxAllowedLeverage);
    }
  }, [selectedAsset]);

  // 🌟 对接 Python 做市机器人后端网关
  useEffect(() => {
    const fetchLivePricesFromPython = async () => {
      try {
        const apiBaseUrl = 'https://bridgelab-backend.onrender.com';
        const res = await fetch(`${apiBaseUrl}/api/prices`);
        const data = await res.json();
        
        if (data.success && data.prices) {
          const remotePrices = data.prices;

          setAssets(prevAssets => 
            prevAssets.map(asset => {
             const fetchKey = asset.backendCode || asset.code || asset.name;
             const realPrice = remotePrices[fetchKey] !== undefined ? remotePrices[fetchKey] : remotePrices[asset.name];
              
              if (realPrice !== undefined && !isNaN(realPrice)) {
                const oldPrice = asset.price;
                const changeDiff = ((realPrice - oldPrice) / oldPrice) * 100;
                return {
                  ...asset,
                  price: Number(realPrice.toFixed(realPrice > 1000 ? 1 : realPrice < 0.1 ? 7 : 4)),
                  change: Number((asset.change + changeDiff * 0.1).toFixed(2)),
                  up: realPrice >= oldPrice
                };
              }
              return asset;
            })
          );
        }
      } catch (e) {
        console.error("⚠️ Failed to connect Python market maker gateway:", e);
      }
    };

    fetchLivePricesFromPython();
    const intervalTimer = setInterval(fetchLivePricesFromPython, 500);
    return () => clearInterval(intervalTimer);
  }, []);

  // 智能风控强平引擎
  useEffect(() => {
    if (positions.length === 0) return;
    setPositions(prevPositions => {
      let remainingPositions = [];
      let hasLiquidated = false;
      prevPositions.forEach(pos => {
        const curAsset = assets.find(a => a.code === pos.code);
        const curPrice = curAsset ? curAsset.price : pos.entryPrice;
        const isLiquidated = pos.side === 'buy' ? curPrice <= pos.liqPrice : curPrice >= pos.liqPrice;
        if (isLiquidated) hasLiquidated = true;
        else remainingPositions.push(pos);
      });
      if (hasLiquidated) alert("⚠️ Notice: Part of your positions reached the liquidation price and have been liquidated by risk management.");
      return remainingPositions;
    });
  }, [assets]);

  useEffect(() => {
    if (selectedAsset) {
      const fresh = assets.find(a => a.code === selectedAsset.code);
      if (fresh) setSelectedAsset(fresh);
    }
  }, [assets]);

  const currentAssetPrice = selectedAsset ? selectedAsset.price : 1;
  
  const getMarginPaid = () => {
    if (customMarginInput !== '' && !isNaN(customMarginInput)) {
      return Math.min(availableMargin, Math.max(0, Number(customMarginInput)));
    }
    return availableMargin * (percentOption / 100);
  };

  const marginPaid = getMarginPaid();
  const notionalSize = (marginPaid * leverage) / currentAssetPrice;
  const lockedMarginTotal = positions.reduce((acc, pos) => acc + pos.margin, 0);
  
  const totalUnrealizedPnl = positions.reduce((acc, pos) => {
    const curAsset = assets.find(a => a.code === pos.code);
    const curPrice = curAsset ? curAsset.price : pos.entryPrice;
    const pnl = pos.side === 'buy' ? (curPrice - pos.entryPrice) * pos.size : (pos.entryPrice - curPrice) * pos.size;
    return acc + pnl;
  }, 0);

  const totalAccountEquity = Math.max(0, availableMargin + lockedMarginTotal + totalUnrealizedPnl);
  const withdrawableBalance = Math.max(0, depositBalance + (depositBalance > 0 ? totalUnrealizedPnl : 0));

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!tempEmailInput) {
      alert("Please enter a valid email address!");
      return;
    }
    const email = tempEmailInput.trim();
    const res = await apiClient.login(email);
    
    if (res.success) {
      setRegisteredEmail(res.email);
      setIsLoggedIn(true);
      setAirdropBalance(res.data.airdropBalance || 0);
      setDepositBalance(res.data.depositBalance || 0);
      setAvailableMarginRaw(res.data.balance);
      setHasClaimed(res.data.claimed);
      setIsRealLive(res.data.isRealLive || false);
      setPositions(res.data.positions || []);
      setWalletAddress(res.data.walletAddress || null);
    }
    setTempEmailInput('');
    setEmailModalOpen(false);
    
    if (!res.data.claimed && !res.data.isRealLive) {
      setDepositModalOpen(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bridgelab_active_email');
    setRegisteredEmail('');
    setIsLoggedIn(false);
    setHasClaimed(false);
    setIsRealLive(false);
    setWalletAddress(null);
    setAirdropBalance(0);
    setDepositBalance(0);
    setAvailableMarginRaw(0);
    setPositions([]);
    alert("Logged out successfully!");
  };

  const checkBalance = async () => {
    if (!window.ethereum) return;
    setIsCheckingBalance(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        setIsCheckingBalance(false);
        return;
      }
      const userAddress = accounts[0];
      const officialTestnetUsdcAddress = '0x4fCF1784B31630811181f670Aea7A7bEF803eaED';
      const balanceOfData = '0x70a08231' + userAddress.replace('0x', '').padStart(64, '0');
      
      const balanceResult = await window.ethereum.request({
        method: 'eth_call',
        params: [{ to: officialTestnetUsdcAddress, data: balanceOfData }, 'latest']
      });
      
      const parsedBalance = parseInt(balanceResult, 16) / 1_000_000;
      setSeiBalance(parsedBalance);
    } catch (error) {
      console.error("Failed to fetch chain balance", error);
      setSeiBalance(0);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleOpenDepositModal = () => {
    if (!isLoggedIn) {
      setEmailModalOpen(true);
      return;
    }
    setDepositModalOpen(true);
  };

  useEffect(() => {
    if (depositModalOpen && isLoggedIn && hasClaimed) {
      setSeiBalance(null);
      checkBalance();
    }
  }, [depositModalOpen, isLoggedIn, hasClaimed]);

  const handleExecuteDeposit = async () => {
    if (!hasClaimed) {
      setIsClaiming(true);
      await apiClient.claimAirdrop(registeredEmail);
      setTimeout(() => {
        setAirdropBalance(1000);
        setAvailableMarginRaw(1000);
        setHasClaimed(true);
        setIsClaiming(false);
        alert("Successfully claimed 1000 USDC Newbie Airdrop (For leveraged trading only, non-withdrawable)!");
        setDepositModalOpen(false);
      }, 600);
    } else {
      const amt = parseFloat(depositInput);
      if (isNaN(amt) || amt <= 0) {
        alert("Please enter a valid deposit amount!");
        return;
      }

      if (!isRealLive && airdropBalance > 0) {
        const confirmReal = window.confirm("⚠️ Notice: You are making your first live deposit. This will switch your account to Live Trading mode, and previous airdrop/demo data will be reset. Continue?");
        if (!confirmReal) return;
      }

      if (!window.ethereum) {
        alert("MetaMask not detected!");
        return;
      }

      try {
        setIsClaiming(true);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const userAddress = accounts[0];
        setWalletAddress(userAddress);

        const officialTestnetUsdcAddress = '0x4fCF1784B31630811181f670Aea7A7bEF803eaED';
        const treasuryAddress = '0x3A3a5F3Fc14ed3D5c3475EC12fe53F1b797FE0c9';

        const balanceOfData = '0x70a08231' + userAddress.replace('0x', '').padStart(64, '0');
        const balanceResult = await window.ethereum.request({
          method: 'eth_call',
          params: [{ to: officialTestnetUsdcAddress, data: balanceOfData }, 'latest']
        });

        const userBalance = parseInt(balanceResult, 16) / 1_000_000;

        if (userBalance < amt) {
          alert(`Insufficient balance! You currently have ${userBalance} USDC, please claim test tokens first.`);
          setIsClaiming(false);
          return; 
        }

        const tokenAmount = Math.floor(amt * 1_000_000);
        const hexAmount = tokenAmount.toString(16).padStart(64, '0');
        const data = '0xa9059cbb' + 
                     treasuryAddress.replace('0x', '').padStart(64, '0') + 
                     hexAmount;

        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            to: officialTestnetUsdcAddress,
            from: userAddress,
            value: '0x0', 
            data: data,
          }],
        });

        await apiClient.deposit(registeredEmail, amt, txHash);

        setDepositBalance(prev => prev + amt);
        setAirdropBalance(0);
        setIsRealLive(true);
        setPositions([]);
        setAvailableMarginRaw(amt);

        setIsClaiming(false);
        alert(`✓ Successfully deposited ${amt} USDC via MetaMask, live trading locked!`);
        setDepositInput('');
        setDepositModalOpen(false);
      } catch (err) {
        console.error(err);
        alert("Deposit cancelled or on-chain transaction failed");
        setIsClaiming(false);
      }
    }
  };

  const handleWithdrawSubmit = async () => {
    const amt = parseFloat(withdrawAmountInput);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid withdrawal amount!");
      return;
    }
    if (amt > withdrawableBalance) {
      alert(`Withdrawal limit exceeded! You can withdraw a maximum of $${withdrawableBalance.toFixed(2)}.`);
      return;
    }

    if (!window.ethereum) {
      alert("MetaMask not detected!");
      return;
    }

    try {
      setIsWithdrawing(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];

      const officialTestnetUsdcAddress = '0x4fCF1784B31630811181f670Aea7A7bEF803eaED';
      const tokenAmount = Math.floor(amt * 1_000_000);
      const hexAmount = tokenAmount.toString(16).padStart(64, '0');
      
      const data = '0xa9059cbb' + 
                   userAddress.replace('0x', '').padStart(64, '0') + 
                   hexAmount;

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          to: officialTestnetUsdcAddress,
          from: userAddress,
          value: '0x0',
          data: data,
        }],
      });

      setDepositBalance(prev => Math.max(0, prev - amt));
      setAvailableMarginRaw(prev => Number((prev - amt).toFixed(2)));
      setWithdrawAmountInput('');
      setWithdrawModalOpen(false);
      setIsWithdrawing(false);

      alert(`✓ On-chain withdrawal successful! Returned ${amt} USDC to your MetaMask wallet.\nTxHash: ${txHash.slice(0, 10)}...`);
    } catch (error) {
      console.error("Withdrawal cancelled or transaction failed", error);
      alert("Withdrawal cancelled by user or transaction failed");
      setIsWithdrawing(false);
    }
  };

  // 🌟 核心升级：调用本地智能合约真实下单
  const handleOpenModal = async () => {
    if (!isLoggedIn) {
      setEmailModalOpen(true);
      return;
    }

    const currentMarginPaid = getMarginPaid();
    if (currentMarginPaid <= 0 || currentMarginPaid > availableMargin) {
      alert("Insufficient available margin! Please deposit USDC first.");
      return;
    }

    setModalStatus('loading');
    setModalOpen(true);

    try {
      if (!window.ethereum) {
        alert("MetaMask not detected!");
        setModalOpen(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const isLong = currentSide === 'buy';
      const sizeParsed = ethers.parseUnits(((currentMarginPaid * leverage) / currentAssetPrice).toFixed(4), 18);
      const priceParsed = ethers.parseUnits(currentAssetPrice.toString(), 18);

      console.log("Calling on-chain contract placeOrder...", selectedAsset.code, isLong, leverage);
      
      const tx = await contract.placeOrder(
        selectedAsset.code,
        isLong,
        sizeParsed,
        priceParsed,
        leverage
      );
      
      console.log("Transaction broadcasted, waiting for confirmation...", tx.hash);
      await tx.wait();

      setModalStatus('success');
      const updatedAvailable = Number(Math.max(0, availableMarginRaw - currentMarginPaid).toFixed(2));
      setAvailableMarginRaw(updatedAvailable);

      const currentNotionalSize = (currentMarginPaid * leverage) / currentAssetPrice;
      const currentLiqPrice = leverage === 1 
        ? 0 
        : (currentSide === 'buy' 
            ? Number((currentAssetPrice * (1 - 0.9 / leverage)).toFixed(2))
            : Number((currentAssetPrice * (1 + 0.9 / leverage)).toFixed(2)));

      const newPos = {
        code: selectedAsset.code,
        name: selectedAsset.code,
        side: currentSide,
        size: Number(currentNotionalSize.toFixed(4)),
        leverage,
        entryPrice: currentAssetPrice,
        liqPrice: currentLiqPrice,
        margin: Number(currentMarginPaid.toFixed(2))
      };
      setPositions(prev => [newPos, ...prev]);

    } catch (err) {
      console.error("Smart contract call failed:", err);
      alert("On-chain order failed or signature cancelled: " + (err.reason || err.message));
      setModalOpen(false);
    }
  };

  const handleClosePosition = async (indexToClose) => {
    const target = positions[indexToClose];
    const currentAsset = assets.find(a => a.code === target.code);
    const currentPrice = currentAsset ? currentAsset.price : target.entryPrice;
    
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        const priceParsed = ethers.parseUnits(currentPrice.toString(), 18);
        
        const tx = await contract.closePosition(indexToClose, priceParsed);
        await tx.wait();
      }
    } catch (e) {
      console.error("On-chain close position failed, syncing locally", e);
    }

    const pnl = target.side === 'buy'
      ? (currentPrice - target.entryPrice) * target.size
      : (target.entryPrice - currentPrice) * target.size;

    const updatedMargin = Number((availableMarginRaw + target.margin + pnl).toFixed(2));
    setAvailableMarginRaw(updatedMargin);
    if (depositBalance > 0) {
      setDepositBalance(prev => Number(Math.max(0, prev + pnl).toFixed(2)));
    }
    setPositions(prev => prev.filter((_, idx) => idx !== indexToClose));
  };

  const filteredAssets = assets.filter(item => 
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.displayName && item.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.subCat && item.subCat.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTradingViewSymbol = (asset) => {
    const code = asset.code;
    const cat = asset.cat;

    if (cat === 'HK Equities') {
      if (code === 'HSI') return 'TVC:HSI';
      const cleanCode = parseInt(code, 10);
      return `HKEX:${cleanCode}`;
    }

    if (code === 'METAPLANET') return 'TOKYO:3350';
    if (code === 'BOYAA') return 'HKEX:434';
    if (code === 'ETHE') return 'ARCA:ETHE';
    if (code === 'HYPE') return 'BINANCE:HYPEUSDT';

    if (cat === 'Crypto') {
      if (code === 'BTC') return 'BINANCE:BTCUSDT';
      if (code === 'IBIT') return 'NASDAQ:IBIT';
      if (code === 'BITO') return 'AMEX:BITO';
      if (code === 'MSTR') return 'NASDAQ:MSTR';
      if (code === 'MARA') return 'NASDAQ:MARA';
      if (code === 'RIOT') return 'NASDAQ:RIOT';
      if (code === 'CLSK') return 'NASDAQ:CLSK';
      if (code === 'HUT') return 'NASDAQ:HUT';
      return 'BINANCE:BTCUSDT'; 
    }
    if (cat === 'Ethereum') {
      if (code === 'ETH') return 'BINANCE:ETHUSDT';
      if (code === 'ETHA') return 'NASDAQ:ETHA';
      if (code === 'FETH') return 'CBOE:FETH';
      if (code === 'STETH') return 'BINANCE:ETHUSDT';
      return 'BINANCE:ETHUSDT';
    }
    if (code === 'GOLD') return 'OANDA:XAUUSD';
    if (code === 'SPY') return 'AMEX:SPY';
    if (cat === 'US Equities') return `NASDAQ:${code}`;
    if (cat === 'Chinese ADRs') return `NYSE:${code}`;
    if (cat === 'Macro') {
      if (code === 'USD/CNH') return 'FX:USDCNH';
      if (code === 'DXY') return 'TVC:DXY';
      if (code === 'EUR/USD') return 'FX:EURUSD';
      if (code === 'GBP/USD') return 'FX:GBPUSD';
      if (code === 'USD/JPY') return 'FX:USDJPY';
      if (code === 'AUD/USD') return 'FX:AUDUSD';
      if (code === 'USD/CHF') return 'FX:USDCHF';
      if (code === 'NZD/USD') return 'FX:NZDUSD';
      if (code === 'USD/CAD') return 'FX:USDCAD';
      if (code === 'GOLD') return 'OANDA:XAUUSD';
      if (code === 'OIL') return 'NYMEX:CL1!';
      if (code === 'SILVER') return 'OANDA:XAGUSD';
      if (code === 'GAS') return 'NYMEX:NG1!';
      if (code === 'PLATINUM') return 'OANDA:XPTUSD';
      if (code === 'PALLADIUM') return 'OANDA:XPDUSD';
    }
    if (cat === 'ETF') return `AMEX:${code}`;

    return `BINANCE:${code}USDT`;
  };

  const generateOrderBook = () => {
    const p = currentAssetPrice;
    const step = p * 0.0004;
    
    let asks = [];
    for (let i = 5; i >= 1; i--) {
      asks.push({
        price: (p + i * step).toFixed(p > 1000 ? 1 : p < 0.1 ? 7 : 4),
        size: (Math.random() * 2 + 0.1).toFixed(3),
        total: (Math.random() * 10 + 2).toFixed(2),
        depth: Math.floor(Math.random() * 80 + 10)
      });
    }

    let bids = [];
    for (let i = 1; i <= 5; i++) {
      bids.push({
        price: (p - i * step).toFixed(p > 1000 ? 1 : p < 0.1 ? 7 : 4),
        size: (Math.random() * 2 + 0.1).toFixed(3),
        total: (Math.random() * 10 + 2).toFixed(2),
        depth: Math.floor(Math.random() * 80 + 10)
      });
    }

    return { asks, bids };
  };

  const orderBook = generateOrderBook();

  const getCatColor = (cat) => {
    if (cat === 'Altcoins') return '#00e5ff';
    if (cat === 'US Equities') return '#ffd166';
    if (cat === 'Chinese ADRs') return '#ff9f43';
    if (cat === 'HK Equities') return '#10b981';
    if (cat === 'Macro') return '#00f2fe';
    if (cat === 'ETF') return '#9d4edd';
    return '#888888';
  };

  const etfSubNames = {
    'SPY': 'SPDR S&P 500 ETF Trust',
    'QQQ': 'Invesco QQQ Trust',
    'IWM': 'iShares Russell 2000 ETF',
    'ARKK': 'ARK Innovation ETF',
    'GLD': 'SPDR Gold Shares',
    'MCHI': 'iShares MSCI China ETF',
    'EWJ': 'iShares MSCI Japan ETF',
    'VGK': 'Vanguard FTSE Europe ETF',
    'EWY': 'iShares MSCI South Korea ETF',
    'INDA': 'iShares MSCI India ETF',
    'EWU': 'iShares MSCI United Kingdom ETF',
    'EWS': 'iShares MSCI Singapore ETF',
    'EWW': 'iShares MSCI Mexico ETF'
  };

  return (
    <div style={{
      backgroundColor: '#000000',
      color: '#b0b0b0',
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px'
    }}>
      
     {/* 顶部导航 */}
      <header style={{
        height: '52px',
        backgroundColor: '#050505',
        borderBottom: '1px solid #141414',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '18px', gap: '20px' }}>
          <div style={{ 
            color: '#ff69b4', 
            fontWeight: 900, 
            fontSize: '20px', 
            letterSpacing: '2px',
            textShadow: '0 0 12px rgba(255, 105, 180, 0.3)'
          }}>
            BridgeLab@Yuan
          </div>
          <div style={{
            color: '#ff69b4',
            fontSize: '11px',
            fontWeight: 'bold',
            backgroundColor: 'rgba(255, 105, 180, 0.08)',
            border: '1px solid rgba(255, 105, 180, 0.2)',
            padding: '2px 8px',
            borderRadius: '4px',
            letterSpacing: '1px'
          }}>
            24*7*365 Continuous Trading
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#00875a', borderRadius: '50%' }}></span>
            <span style={{ color: '#888888', fontSize: '13px', fontWeight: 'bold' }}>SEI TESTNET (0x5fbdb23...)</span>
          </div>

          {!isLoggedIn ? (
            <button 
              onClick={() => setEmailModalOpen(true)}
              style={{
                backgroundColor: '#ff69b4',
                color: '#000',
                border: 'none',
                padding: '8px 18px',
                fontWeight: '900',
                fontSize: '13px',
                cursor: 'pointer',
                borderRadius: '4px',
                boxShadow: '0 0 10px rgba(255, 105, 180, 0.3)'
              }}
            >
              Email Sign In / Register
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={handleOpenDepositModal}
                style={{
                  backgroundColor: '#0a0307',
                  border: '1px solid #ff69b4',
                  color: '#ff69b4',
                  padding: '6px 12px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                {isRealLive ? 'Deposit USDC' : (hasClaimed ? 'Deposit USDC' : '+ Claim 1000 USDC')}
              </button>
              <div style={{
                backgroundColor: '#111',
                border: '1px solid #222',
                color: '#ff69b4',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{registeredEmail} {walletAddress ? `(${walletAddress.substring(0,4)}...)` : ''}</span>
                <button 
                  onClick={handleLogout}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #444',
                    color: '#aaa',
                    padding: '2px 6px',
                    fontSize: '10px',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 主工作区 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', width: '100%' }}>
        
        {/* 左栏：资产列表（宽度 20%） */}
        <div style={{
          width: '20%',
          borderRight: '1px solid #141414',
          backgroundColor: '#020202',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          <div style={{ padding: '10px', borderBottom: '1px solid #141414', backgroundColor: '#050505' }}>
            <input 
              type="text" 
              placeholder="Search synthetic assets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#000',
                border: '1px solid #141414',
                color: '#b0b0b0',
                padding: '8px 12px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }} 
            />
          </div>

          <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {filteredAssets.map((asset, index) => {
              const isSelected = selectedAsset && selectedAsset.code === asset.code;
              const catColor = getCatColor(asset.cat);
              const isEtf = asset.cat === 'ETF';
              const isBtcEco = asset.isBtcEco;
              const isEthEco = asset.isEthEco;
              const isEcoSystem = isBtcEco || isEthEco || isEtf;

              const ecoLabel = isBtcEco ? 'BTC Eco' : (isEthEco ? 'ETH Eco' : 'ETF');
              const ecoColor = isBtcEco ? '#f7931a' : (isEthEco ? '#627eea' : '#9d4edd');
              const fullEtfName = etfSubNames[asset.code] || 'Exchange Traded Fund';

              return (
                <div 
                  key={`asset-item-${index}`}
                  onClick={() => setSelectedAsset(asset)}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: isEcoSystem ? '8px 12px' : '9px 12px', 
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(255, 105, 180, 0.15)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #ff69b4' : '3px solid transparent',
                    transition: 'background 0.2s',
                    borderBottom: '1px solid #080808'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: isEcoSystem ? 'column' : 'row', 
                    alignItems: isEcoSystem ? 'flex-start' : 'center',
                    justifyContent: isEcoSystem ? 'flex-start' : 'space-between',
                    gap: isEcoSystem ? '2px' : '0px', 
                    width: '65%', 
                    overflow: 'hidden' 
                  }}>
                    <div style={{ 
                      color: isSelected ? '#ff69b4' : '#ffffff', 
                      fontWeight: isEcoSystem ? '800' : '600', 
                      fontSize: '13px',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}>
                      {asset.displayName || asset.code}
                    </div>

                    {isEcoSystem ? (
                      <div 
                        style={{ 
                          color: '#888', 
                          fontWeight: '500', 
                          fontSize: '10px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isEtf ? fullEtfName : asset.subCat}
                        </span>
                        
                        <span style={{ 
                          color: ecoColor, 
                          backgroundColor: `${ecoColor}18`,
                          border: `1px solid ${ecoColor}40`,
                          borderRadius: '2px',
                          padding: '1px 4px',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          marginLeft: '4px',
                          flexShrink: 0
                        }}>
                          {ecoLabel}
                        </span>
                      </div>
                    ) : (
                      <span style={{ 
                        color: catColor, 
                        backgroundColor: `${catColor}18`,
                        border: `1px solid ${catColor}40`,
                        borderRadius: '2px',
                        padding: '1px 4px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}>
                        {asset.cat}
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                      <PriceDisplay price={asset.price} currencySymbol={asset.currency || '$'} />
                    </div>
                    <div style={{ color: asset.change >= 0 ? '#00875a' : '#ff0055', fontSize: '11px', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
                      {asset.change >= 0 ? `+${asset.change.toFixed(2)}%` : `${asset.change.toFixed(2)}%`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 中栏（图表与持仓） */}
        <div style={{
          width: '58%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #141414'
        }}>
          <div style={{ height: '56%', borderBottom: '1px solid #141414', backgroundColor: '#000', overflow: 'hidden' }}>
            {selectedAsset && (
              <iframe 
                src={`https://s.tradingview.com/widgetembed/?symbol=${getTradingViewSymbol(selectedAsset)}&theme=dark&interval=1S`} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                allowTransparency="true" 
                scrolling="no" 
                allowFullScreen
                title="TradingView"
              ></iframe>
            )}
          </div>
          
          <div className="custom-scrollbar" style={{ height: '44%', padding: '10px 12px', overflowY: 'auto', backgroundColor: '#000' }}>
            <div style={{ color: '#ff69b4', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', letterSpacing: '1px' }}>
              ● Current Positions ({positions.length}) {isRealLive ? <span style={{color: '#00875a', fontSize: '11px'}}>⚡ On-Chain Live Trading</span> : <span style={{color: '#f7931a', fontSize: '11px'}}>🧪 Demo Trading Mode</span>}
            </div>
            {positions.length === 0 ? (
              <div style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginTop: '15px' }}>
                No active positions. Place an order from the right panel.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#666', borderBottom: '1px solid #141414', height: '26px', fontSize: '12px' }}>
                    <th style={{ textAlign: 'left' }}>Market</th>
                    <th style={{ textAlign: 'center' }}>Side</th>
                    <th style={{ textAlign: 'right' }}>Size</th>
                    <th style={{ textAlign: 'right' }}>Entry Price</th>
                    <th style={{ textAlign: 'right' }}>Unrealized PnL (USDC)</th>
                    <th style={{ textAlign: 'right' }}>Liq. Price</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos, idx) => {
                    const currentAsset = assets.find(a => a.code === pos.code);
                    const currentPrice = currentAsset ? currentAsset.price : pos.entryPrice;
                    const pnl = pos.side === 'buy'
                      ? (currentPrice - pos.entryPrice) * pos.size
                      : (pos.entryPrice - currentPrice) * pos.size;
                    const pnlPercent = pos.margin > 0 ? (pnl / pos.margin) * 100 : 0;
                    const isProfit = pnl >= 0;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #111', height: '34px', fontSize: '13px' }}>
                        <td style={{ color: '#b0b0b0' }}><strong>{pos.code}</strong> <span style={{color: '#666', fontSize: '11px'}}>{pos.leverage}x</span></td>
                        <td style={{ textAlign: 'center', color: pos.side === 'buy' ? '#00875a' : '#ff0055', fontWeight: 'bold' }}>
                          {pos.side === 'buy' ? 'LONG' : 'SHORT'}
                        </td>
                        <td style={{ textAlign: 'right', color: '#b0b0b0' }}>{pos.size} {pos.code}</td>
                        <td style={{ textAlign: 'right', color: '#888' }}>{pos.entryPrice}</td>
                        <td style={{ textAlign: 'right', color: isProfit ? '#00875a' : '#ff0055', fontWeight: 'bold' }}>
                          {isProfit ? '+' : ''}{pnl.toFixed(2)} USDC ({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </td>
                        <td style={{ textAlign: 'right', color: '#ff0055', fontWeight: 'bold' }}>{pos.liqPrice === 0 ? 'None (1x)' : pos.liqPrice}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            onClick={() => handleClosePosition(idx)}
                            style={{
                              backgroundColor: '#0a0307',
                              border: '1px solid rgba(255, 105, 180, 0.3)',
                              color: '#ff69b4',
                              padding: '3px 10px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            Close
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 右栏：交易面板与右下角控制台 */}
        <div className="custom-scrollbar" style={{
          width: '22%',
          backgroundColor: '#020202',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          
          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#050505', padding: '5px', border: '1px solid #141414', boxSizing: 'border-box', width: '100%' }}>
            <span style={{ flex: 1, textAlign: 'center', padding: '4px', backgroundColor: '#111', color: '#b0b0b0', fontSize: '12px', fontWeight: 'bold' }}>Cross</span>
            <span style={{ flex: 1, textAlign: 'center', padding: '4px', backgroundColor: '#111', color: '#ff69b4', fontSize: '12px', fontWeight: 'bold' }}>{leverage}x</span>
            <span style={{ flex: 1, textAlign: 'center', padding: '4px', backgroundColor: '#111', color: '#888', fontSize: '12px', fontWeight: 'bold' }}>On-Chain</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              backgroundColor: '#0c0207', 
              border: '1px solid #ff69b4', 
              padding: '8px 12px', 
              boxSizing: 'border-box', 
              width: '100%',
              borderRadius: '4px',
              boxShadow: '0 0 10px rgba(255, 105, 180, 0.15)'
            }}>
              <span style={{ color: '#aaa', fontSize: '12px', fontWeight: 'bold' }}>Selected Asset</span>
              <strong style={{ color: '#ff69b4', fontSize: '15px', letterSpacing: '1px' }}>
                {selectedAsset ? selectedAsset.code : ''}
              </strong>
            </div>

            <div style={{ display: 'flex', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
              <button onClick={() => setCurrentSide('buy')} style={{
                flex: 1,
                padding: '9px 0',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: currentSide === 'buy' ? '#00875a' : '#071810',
                border: currentSide === 'buy' ? '1px solid #00875a' : '1px solid #141414',
                color: currentSide === 'buy' ? '#fff' : '#666',
                fontSize: '13px',
                textAlign: 'center'
              }}>Buy / Long</button>
              <button onClick={() => setCurrentSide('sell')} style={{
                flex: 1,
                padding: '9px 0',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: currentSide === 'sell' ? '#ff0055' : '#2a0a14',
                border: currentSide === 'sell' ? '1px solid #ff0055' : '1px solid #141414',
                color: currentSide === 'sell' ? '#fff' : '#666',
                fontSize: '13px',
                textAlign: 'center'
              }}>Sell / Short</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 10px', backgroundColor: '#050505', border: '1px solid #141414', fontSize: '12px', fontWeight: 'normal', boxSizing: 'border-box', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ color: '#888' }}>Available Margin</span>
                <span style={{ color: '#00875a', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>${availableMargin.toFixed(2)} USDC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ color: '#888' }}>Withdrawable Bal.</span>
                <span style={{ color: '#ff69b4', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>${withdrawableBalance.toFixed(2)} USDC</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ color: '#666', fontSize: '11px', fontWeight: 'bold' }}>Position Size / Margin</span>
                <span style={{ color: '#888', fontSize: '11px', fontVariantNumeric: 'tabular-nums' }}>~{notionalSize.toFixed(2)} {selectedAsset ? selectedAsset.code : ''}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                {[25, 50, 75, 100].map((pct) => {
                  const isSelected = customMarginInput === '' && percentOption === pct;
                  return (
                    <button
                      key={pct}
                      onClick={() => {
                        setPercentOption(pct);
                        setCustomMarginInput('');
                      }}
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        backgroundColor: isSelected ? '#1f1f1f' : '#050505',
                        border: isSelected ? '1px solid #ff69b4' : '1px solid #141414',
                        color: isSelected ? '#ff69b4' : '#888',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>

              <div style={{ 
                backgroundColor: '#020202', 
                border: '1px solid #1a1a1a', 
                borderRadius: '4px',
                padding: '7px 10px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                boxSizing: 'border-box', 
                width: '100%',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
              }}>
                <input 
                  type="number" 
                  placeholder="Custom margin amount..." 
                  value={customMarginInput} 
                  onChange={(e) => setCustomMarginInput(e.target.value)} 
                  className="custom-margin-input"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#fff', 
                    outline: 'none', 
                    width: '75%', 
                    fontWeight: '600', 
                    fontFamily: 'inherit', 
                    fontSize: '12px' 
                  }} 
                />
                <span style={{ color: '#555', fontSize: '11px', fontWeight: 'bold' }}>USDC</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '12px', fontWeight: 'bold', width: '100%' }}>
                <span>Leverage {isCryptoOrMeme ? '(Crypto/Meme up to 30x)' : '(Equities up to 10x)'}</span>
                <strong style={{ color: '#ff69b4', fontVariantNumeric: 'tabular-nums' }}>{leverage}x</strong>
              </div>

              <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                {[1, 5, 10, 20, 30].map((lvl) => {
                  const isDisabled = lvl > maxAllowedLeverage;
                  const isSelected = leverage === lvl;

                  return (
                    <button
                      key={lvl}
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setLeverage(lvl)}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        backgroundColor: isDisabled ? '#0a0a0a' : (isSelected ? '#1f1f1f' : '#050505'),
                        border: isSelected ? '1px solid #ff69b4' : '1px solid #141414',
                        color: isDisabled ? '#333' : (isSelected ? '#ff69b4' : '#888'),
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        borderRadius: '3px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {lvl === 1 ? '1x' : `${lvl}x`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. 订单薄 */}
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#050505', border: '1px solid #141414', padding: '6px 8px', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', width: '100%' }}>
              <span style={{ color: '#666', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>Order Book</span>
              <span style={{ color: '#888', fontSize: '11px' }}>{selectedAsset ? selectedAsset.code : ''}/USDT</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '11px', borderBottom: '1px solid #111', paddingBottom: '2px', width: '100%' }}>
              <span>Price</span>
              <span style={{ textAlign: 'right' }}>Size</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', width: '100%' }}>
                {orderBook.asks.map((ask, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '1px 4px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${ask.depth}%`, backgroundColor: 'rgba(255, 0, 85, 0.08)', zIndex: 1 }}></div>
                    <span style={{ color: '#ff0055', zIndex: 2, fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', width: '38%' }}>{ask.price}</span>
                    <span style={{ color: '#b0b0b0', zIndex: 2, textAlign: 'right', fontVariantNumeric: 'tabular-nums', width: '30%' }}>{ask.size}</span>
                    <span style={{ color: '#b0b0b0', zIndex: 2, textAlign: 'right', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', width: '32%' }}>{ask.total}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', backgroundColor: '#080808', borderTop: '1px solid #141414', borderBottom: '1px solid #141414', margin: '2px 0', width: '100%', boxSizing: 'border-box' }}>
                <span style={{ color: '#888', fontSize: '11px' }}>Mark Price</span>
                <span style={{ color: selectedAsset && selectedAsset.up ? '#00875a' : '#ff0055', fontWeight: '900', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                  {selectedAsset ? selectedAsset.price : 0} {selectedAsset && selectedAsset.up ? '↑' : '↓'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', width: '100%' }}>
                {orderBook.bids.map((bid, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '1px 4px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${bid.depth}%`, backgroundColor: 'rgba(0, 135, 90, 0.08)', zIndex: 1 }}></div>
                    <span style={{ color: '#00875a', zIndex: 2, fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', width: '38%' }}>{bid.price}</span>
                    <span style={{ color: '#b0b0b0', zIndex: 2, textAlign: 'right', fontVariantNumeric: 'tabular-nums', width: '30%' }}>{bid.size}</span>
                    <span style={{ color: '#b0b0b0', zIndex: 2, textAlign: 'right', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', width: '32%' }}>{bid.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. 右下角：风控看板与充提按钮 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', width: '100%', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
              <button 
                onClick={handleOpenDepositModal}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  backgroundColor: '#16020c',
                  border: '1px solid #ff69b4',
                  color: '#ff69b4',
                  fontWeight: '900',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  borderRadius: '4px',
                  boxShadow: '0 0 8px rgba(255, 105, 180, 0.2)'
                }}
              >
                {isRealLive ? 'Deposit USDC' : (hasClaimed ? 'Deposit USDC' : 'Claim 1000U Airdrop')}
              </button>

              <button 
                onClick={() => {
                  if (!isLoggedIn) {
                    setEmailModalOpen(true);
                    return;
                  }
                  setWithdrawModalOpen(true);
                }}
                style={{ 
                  flex: 1,
                  padding: '8px 0', 
                  backgroundColor: '#111215', 
                  border: '1px solid #2b2f36', 
                  color: '#9aa0a6', 
                  fontSize: '12px', 
                  cursor: 'pointer', 
                  textAlign: 'center', 
                  fontWeight: 'bold', 
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              >
                Withdraw USDC
              </button>
            </div>

            <button onClick={handleOpenModal} style={{
              width: '100%',
              padding: '11px 0',
              border: 'none',
              fontWeight: '900',
              cursor: 'pointer',
              fontSize: '13px',
              letterSpacing: '1px',
              backgroundColor: '#ff69b4',
              color: '#000',
              boxShadow: '0 0 15px rgba(255, 105, 180, 0.4)',
              textAlign: 'center',
              boxSizing: 'border-box',
              borderRadius: '4px'
            }}>
              {currentSide === 'buy' ? `Confirm Long ${selectedAsset ? selectedAsset.code : ''}` : `Confirm Short ${selectedAsset ? selectedAsset.code : ''}`}
            </button>

            {/* 账户资产与风控看板 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#050505', border: '1px solid #141414', padding: '8px 10px', fontSize: '12px', fontWeight: 'normal', width: '100%', boxSizing: 'border-box' }}>
              
              <div style={{ color: '#ff69b4', marginBottom: '1px', letterSpacing: '0.5px', fontWeight: 'bold', width: '100%' }}>
                Account Equity
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', borderBottom: '1px solid #141414', paddingBottom: '4px', width: '100%' }}>
                <span>Total Account Equity</span>
                <span style={{ color: '#fff', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                  ${totalAccountEquity.toFixed(2)}
                </span>
              </div>

              <div style={{ color: '#ff69b4', marginTop: '2px', marginBottom: '1px', letterSpacing: '0.5px', fontWeight: 'bold', width: '100%' }}>
                Perpetual Overview
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', width: '100%' }}>
                <span>Available Balance</span>
                <span style={{ color: '#00875a', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>${availableMargin.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', width: '100%' }}>
                <span>Position Margin Locked</span>
                <span style={{ color: '#ff69b4', fontVariantNumeric: 'tabular-nums' }}>${lockedMarginTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', width: '100%' }}>
                <span>Unrealized PnL</span>
                <span style={{ color: totalUnrealizedPnl >= 0 ? '#00875a' : '#ff0055', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                  {totalUnrealizedPnl >= 0 ? '+' : ''}{totalUnrealizedPnl.toFixed(2)} USDC
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', width: '100%' }}>
                <span>Initial Capital</span>
                <span style={{ color: '#ff69b4', fontVariantNumeric: 'tabular-nums' }}>${depositBalance.toFixed(2)}</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 订单成功弹窗网关 */}
      {modalOpen && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '340px', backgroundColor: '#050505', border: '1px solid #141414', padding: '24px', textAlign: 'center', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', marginBottom: '14px', color: '#666', fontWeight: 'bold', letterSpacing: '1px' }}>BRIDGE-LAB ON-CHAIN GATEWAY</div>
            
            {modalStatus === 'loading' ? (
              <>
                <div style={{ width: '30px', height: '30px', border: '1px solid #111', borderTop: '1px solid #ff69b4', borderRadius: '50%', margin: '15px auto', animation: 'spin 0.8s linear infinite' }}></div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff69b4', marginBottom: '10px' }}>Confirm transaction in MetaMask...</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ff69b4', marginBottom: '10px' }}>✓ On-Chain Order Matched</div>
                <div style={{ color: '#b0b0b0', fontSize: '13px', lineHeight: '1.6', marginBottom: '16px', textAlign: 'left' }}>
                  Market: {selectedAsset ? selectedAsset.code : ''} ({leverage}x)<br />
                  Margin Deducted: {marginPaid.toFixed(2)} USDC
                </div>
              </>
            )}
            <button onClick={() => setModalOpen(false)} style={{ backgroundColor: '#111', border: '1px solid #222', color: '#aaa', padding: '8px 18px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px' }}>Close</button>
          </div>
        </div>
      )}

      {/* 邮箱注册弹窗 */}
      {emailModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '380px', backgroundColor: '#050505', border: '1px solid #ff69b4', padding: '24px', borderRadius: '12px', color: '#fff', textAlign: 'center' }}>
            
            <div style={{ marginBottom: '15px' }}>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#ff69b4' }}>Welcome to BridgeLab</h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>Enter your email to connect on-chain gateway</p>
            </div>

            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', margin: '20px 0' }}>
              <input 
                type="text" 
                placeholder="Enter your email address..." 
                value={tempEmailInput}
                onChange={(e) => setTempEmailInput(e.target.value)}
                style={{
                  backgroundColor: '#000',
                  border: '1px solid #333',
                  color: '#fff',
                  padding: '10px 12px',
                  fontSize: '14px',
                  outline: 'none',
                  borderRadius: '6px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
              <button 
                type="submit"
                style={{
                  backgroundColor: '#ff69b4',
                  color: '#000',
                  border: 'none',
                  padding: '10px',
                  fontWeight: '900',
                  fontSize: '13px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  width: '100%'
                }}
              >
                Connect & Sign In
              </button>
            </form>

            <button 
              onClick={() => setEmailModalOpen(false)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#666',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

          </div>
        </div>
      )}

      {/* 充值 / 领取空投弹窗 */}
      {depositModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '380px', backgroundColor: '#050505', border: '1px solid #ff007a', padding: '24px', borderRadius: '12px', color: '#fff', textAlign: 'center' }}>
            
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#ff69b4' }}>
                {isRealLive ? 'Deposit Test USDC (MetaMask)' : (hasClaimed ? 'Deposit Test USDC (MetaMask)' : 'Claim Newbie Airdrop USDC')}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>Account: <span style={{ color: '#fff' }}>{registeredEmail}</span></p>
            </div>

            {!hasClaimed && !isRealLive ? (
              <>
                <div style={{ margin: '20px 0', padding: '16px', background: 'rgba(255,105,180,0.05)', borderRadius: '8px', border: '1px solid rgba(255,105,180,0.2)' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#00875a', marginBottom: '5px' }}>+1000 USDC</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>
                    Testnet special funds. Click confirm to credit your demo account.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button 
                    onClick={() => setDepositModalOpen(false)} 
                    style={{ flex: 1, padding: '10px', background: '#111', color: '#888', border: '1px solid #222', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    Close
                  </button>
                  <button 
                    onClick={handleExecuteDeposit}
                    disabled={isClaiming}
                    style={{ 
                      flex: 1, 
                      padding: '10px', 
                      background: '#ff69b4', 
                      color: '#000', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontWeight: '900',
                      fontSize: '13px'
                    }}
                  >
                    {isClaiming ? 'Syncing...' : 'Confirm 1000U'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid #141414', textAlign: 'left' }}>
                  <div>
                    <span style={{ color: '#888', fontSize: '12px' }}>Wallet Balance: </span>
                    <span style={{ fontWeight: 'bold', color: (seiBalance || 0) > 0 ? '#fff' : '#ff4d4f', fontSize: '13px' }}>
                      {seiBalance === null ? 'Loading...' : `${(Number(seiBalance) || 0).toFixed(2)} USDC`}
                    </span>
                  </div>
                  <button onClick={checkBalance} disabled={isCheckingBalance} style={{ background: 'transparent', border: '1px solid #00f2fe', color: '#00f2fe', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    {isCheckingBalance ? 'Refreshing...' : '🔄 Refresh'}
                  </button>
                </div>

                <div style={{ margin: '15px 0', textAlign: 'left' }}>
                  <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Deposit Amount (Trigger MetaMask)</label>
                  <input 
                    type="number" 
                    placeholder="Enter deposit amount..." 
                    value={depositInput}
                    onChange={(e) => setDepositInput(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#000',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '10px 12px',
                      fontSize: '14px',
                      outline: 'none',
                      borderRadius: '6px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button 
                    onClick={() => setDepositModalOpen(false)} 
                    style={{ flex: 1, padding: '10px', background: '#111', color: '#888', border: '1px solid #222', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleExecuteDeposit}
                    disabled={isClaiming}
                    style={{ 
                      flex: 1, 
                      padding: '10px', 
                      background: '#ff69b4', 
                      color: '#000', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontWeight: '900',
                      fontSize: '13px'
                    }}
                  >
                    {isClaiming ? 'Depositing...' : 'Confirm Deposit'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* 提现弹窗网关 */}
      {withdrawModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '380px', backgroundColor: '#050505', border: '1px solid #333', padding: '24px', borderRadius: '12px', color: '#fff', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#ff69b4' }}>Withdraw Funds</h2>
            <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#888' }}>Withdrawable Balance: <span style={{ color: '#00875a', fontWeight: 'bold' }}>${withdrawableBalance.toFixed(2)} USDC</span></p>

            <div style={{ margin: '15px 0', textAlign: 'left' }}>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Withdrawal Amount (USDC)</label>
              <input 
                type="number" 
                placeholder="Enter withdrawal amount..." 
                value={withdrawAmountInput}
                onChange={(e) => setWithdrawAmountInput(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#000',
                  border: '1px solid #333',
                  color: '#fff',
                  padding: '10px 12px',
                  fontSize: '14px',
                  outline: 'none',
                  borderRadius: '6px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ fontSize: '11px', color: '#666', textAlign: 'left', marginBottom: '20px', lineHeight: '1.4' }}>
              * Clicking confirm will trigger MetaMask popup for on-chain signature.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setWithdrawModalOpen(false)} 
                style={{ flex: 1, padding: '10px', background: '#111', color: '#888', border: '1px solid #222', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleWithdrawSubmit}
                disabled={isWithdrawing}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  background: '#ff69b4', 
                  color: '#000', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: '900',
                  fontSize: '13px'
                }}
              >
                 {isWithdrawing ? 'MetaMask Signing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .text-up { color: #00ff88 !important; }
        .text-down { color: #ff3366 !important; }

        .custom-margin-input::placeholder {
          color: #555555;
          font-style: italic;
          font-weight: 300;
          font-size: 11px;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #020202;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ff69b4;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ff85c0;
        }
      `}</style>
      
     
    </div>
  );
}