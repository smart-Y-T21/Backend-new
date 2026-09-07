import time
import requests
from web3 import Web3

# ==========================================
# ⚙️ 配置中心
# ==========================================
# 1. 后端做市机器人网关地址（5001端口）
PRICES_API_URL = "http://127.0.0.1:5001/api/prices"

# 2. 区块链节点配置 (Sei Testnet 或本地测试网)
RPC_URL = "https://evm-rpc.testnet.sei.io"  # 如果是本地 Anvil/Hardhat，可改为 "http://127.0.0.1:8545"
WEB3_PROVIDER = Web3(Web3.HTTPProvider(RPC_URL))

# 3. 智能合约配置（替换为你部署的 PerpEngine 合约地址和 ABI）
CONTRACT_ADDRESS = "0xYourDeployedPerpEngineAddressHere"
CONTRACT_ABI = [
    # 这里填入 PerpEngine 合约中与资金费率或更新相关的 ABI（例如 updateFundingRate）
    {
        "inputs": [
            {"internalType": "string", "name": "asset", "type": "string"},
            {"internalType": "int256", "name": "fundingRate", "type": "int256"}
        ],
        "name": "updateFundingRate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# 机器人执行周期（例如正式环境通常是 3600秒/1小时，测试时可以设为 10 或 30 秒）
INTERVAL_SECONDS = 30

def fetch_market_prices():
    """从 5001 端口的做市机器人获取最新价格缓存"""
    try:
        response = requests.get(PRICES_API_URL, timeout=5)
        data = response.json()
        if data.get("success"):
            return data.get("prices", {})
    except Exception as e:
        print(f"⚠️ [FundingRobot] 无法连接到 5001 价格网关: {e}")
    return {}

def calculate_funding_rates(prices):
    """
    计算资金费率
    公式简化示例：
    假设 BTC 标记价格略高于基准，计算出溢价率。
    返回格式：{ 'BTC': 0.0001, 'ETH': -0.00005, ... }
    """
    funding_rates = {}
    for asset, price in prices.items():
        # 这里可以加入你的多空持仓倾斜度算法
        # 现阶段我们以一个模拟的微小基准费率（例如 0.01%）来演示
        base_rate = 0.0001  
        funding_rates[asset] = base_rate
    return funding_rates

def push_funding_to_chain(asset, rate):
    """将计算好的资金费率同步提交给智能合约"""
    if not WEB3_PROVIDER.is_connected():
        print("⚠️ [FundingRobot] Web3 未连接到链上节点，跳过上链广播。")
        return

    try:
        contract = WEB3_PROVIDER.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_ADDRESS), 
            abi=CONTRACT_ABI
        )
        
        # 将小数费率放大（例如放大 10^6 倍传给 Solidity）
        scaled_rate = int(rate * 10**6)
        
        # 组装交易 (注意：生产环境需要配置 Keeper 机器人的私钥来签名发送交易)
        # account = WEB3_PROVIDER.eth.account.from_private_key("YOUR_KEEPER_PRIVATE_KEY")
        
        print(f"⛓️ [On-Chain] 正在向合约同步资产 {asset} 的资金费率: {scaled_rate}")
        # tx = contract.functions.updateFundingRate(asset, scaled_rate).build_transaction({...})
        # signed_tx = WEB3_PROVIDER.eth.account.sign_transaction(tx, private_key=...)
        # tx_hash = WEB3_PROVIDER.eth.send_raw_transaction(signed_tx.rawTransaction)
        
    except Exception as e:
        print(f"⚠️ [FundingRobot] 链上更新资金费率失败: {e}")

def main():
    print("🚀 [FundingRobot] 资金费率清算机器人已启动...")
    print(f"🔗 正在监听做市网关: {PRICES_API_URL}")

    while True:
        print("\n--------------------------------------------------")
        print(f"⏳ [FundingRobot] 开始新一轮资金费率计算: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 1. 拿价格
        prices = fetch_market_prices()
        if prices:
            print(f"📊 成功从 5001 端口获取到 {len(prices)} 种资产的实时价格。")
            
            # 2. 算费率
            rates = calculate_funding_rates(prices)
            
            # 3. 打印日志并尝试上链
            for asset, rate in rates.items():
                print(f"   - 资产: {asset:<8} | 实时价格: {prices.get(asset):<10} | 资金费率: {rate * 100:.4f}%")
                # push_funding_to_chain(asset, rate)
        else:
            print("⏳ 暂未获取到有效价格，等待下一个周期...")

        # 等待下一个结算周期
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    main()