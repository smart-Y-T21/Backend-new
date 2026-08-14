from web3 import Web3

# 1. 连接 Anvil
w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))
contract_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

# 更新后的 ABI (去掉了 payable)
abi = [
    {"type": "function", "name": "depositRegister", "inputs": [], "outputs": [], "stateMutability": "nonpayable"},
    {"type": "function", "name": "placeOrder", "inputs": [
        {"name": "_asset", "type": "string"}, {"name": "_isLong", "type": "bool"},
        {"name": "_size", "type": "uint256"}, {"name": "_entryPrice", "type": "uint256"},
        {"name": "_leverage", "type": "uint256"}
    ], "outputs": [], "stateMutability": "nonpayable"}
]

contract = w3.eth.contract(address=contract_address, abi=abi)
account = w3.eth.accounts[0] 

def run_robot():
    print("--- 机器人初始化 ---")
    
    # 步骤 1: 注册/初始化保证金 (不需要传钱，函数会自动赋 10000 给你的账户)
    try:
        tx_deposit = contract.functions.depositRegister().transact({'from': account})
        w3.eth.wait_for_transaction_receipt(tx_deposit)
        print("保证金初始化成功 (额度已设为 10000)!")
    except Exception as e:
        print(f"保证金初始化出错: {e}")

    # 步骤 2: 下单 (大小 1，价格 100，杠杆 2)
    # 计算：marginRequired = (1 * 100) / 2 = 50，小于 10000，肯定能成功！
    try:
        print("正在发送下单指令...")
        tx_order = contract.functions.placeOrder("BTC", True, 1, 100, 2).transact({'from': account})
        print(f"订单发送成功! 交易哈希: {tx_order.hex()}")
    except Exception as e:
        print(f"下单出错: {e}")

if __name__ == "__main__":
    run_robot()