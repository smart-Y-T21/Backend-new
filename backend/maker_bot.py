import asyncio
import random
from web3 import Web3
from backend.config import WEB3_PROVIDER_URI, CONTRACT_ADDRESS, CONTRACT_ABI
from backend.price_engine import get_mark_price

w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URI))
contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
account = w3.eth.accounts[0] if w3.eth.accounts else None

async def place_order_on_chain(asset, price):
    try:
        price_int = int(price)
        if price_int <= 0 or not account:
            return
            
        is_long = random.choice([True, False])
        print(f"[{asset}] 🤖 做市商上链挂单: {'🟢 BUY' if is_long else 'SELL'} @ {price_int}")
        
        tx = contract.functions.makerPlaceOrder(
            asset, 
            is_long, 
            Web3.to_wei(1, 'ether'), 
            Web3.to_wei(price_int, 'ether'), 
            20 
        ).transact({'from': account})
        
        w3.eth.wait_for_transaction_receipt(tx)
    except Exception as e:
        print(f"[{asset}] ❌ 链上挂单失败: {e}")

async def maker_loop(asset):
    while True:
        # 🔥 严格使用纯净的标记价格，绝不使用带有视觉噪声的价格
        price = get_mark_price(asset)
        if price > 0:
            await place_order_on_chain(asset, price)
        await asyncio.sleep(6)

async def start_maker_bot(active_assets):
    tasks = [maker_loop(asset) for asset in active_assets]
    await asyncio.gather(*tasks)