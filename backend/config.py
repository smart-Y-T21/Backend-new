from web3 import Web3

# 基础配置
TWELVE_DATA_KEY = "915c41f4729b47298e01a1deae36552c"
WEB3_PROVIDER_URI = "http://127.0.0.1:8545"
CONTRACT_ADDRESS = Web3.to_checksum_address("0xfcdb4564c18a9134002b9771816092c9693622e3")

# 做市商专属 ABI
CONTRACT_ABI = [
    {
        "type": "function",
        "name": "makerPlaceOrder",
        "inputs": [
            {"name": "_asset", "type": "string"},
            {"name": "_isLong", "type": "bool"},
            {"name": "_size", "type": "uint256"},
            {"name": "_entryPrice", "type": "uint256"},
            {"name": "_leverage", "type": "uint256"}
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
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
    }
]

# 资产分组配置
TWELVE_DATA_STOCK_GROUPS = [
    "MSTR,IBIT,BITO,MARA,RIOT,CLSK,HUT",
    "NVDA,TSLA,AAPL,MSFT,AMZN,GOOGL,META,COIN,NFLX,AMD",
   "BABA,PDD,TCEHY,JD,BIDU,NIO,XPEV,LI,BILI,TME",
    "SPY,QQQ,IWM,ARKK,GLD,EWJ,VGK,MCHI,EWY,INDA,EWU,EWS,EWW"
]
TWELVE_DATA_JP_GROUPS = ["3350.T"]
TWELVE_DATA_HK_GROUPS = ["0700.HK,3690.HK,9988.HK,1810.HK,0001.HK,0005.HK,1299.HK,9888.HK,2015.HK,0388.HK,0981.HK,HSI"]
TWELVE_DATA_MACRO_GROUPS = [
    "EUR/USD,GBP/USD,USD/JPY,AUD/USD,USD/CHF,NZD/USD,USD/CAD",
    "USD/CNH,DXY,XAG/USD,XPT/USD,XPD/USD,WTI/USD",
    "XAU/USD"
]
# 🇪🇺 欧股资产独立分组配置（按交易所后缀区分，避免批量混杂报错）
TWELVE_DATA_EU_GROUPS = [
    "ASML:XAMS,MC:XPAR,RMS:XPAR,ROG:XSWX",
    "NOVN:XSWX,AZN:XLON,NOVO-B:XCSE,NESN:XSWX",
    "SIE:XETR,SAP:XETR,SHEL:XAMS,TTE:XPAR",
    "RACE:XMIL,ALV:XETR,RHM:XETR"
]