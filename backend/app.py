import random
import threading
import asyncio
from flask import Flask, jsonify
from flask_cors import CORS
from backend.price_engine import CLEAN_PRICE_CACHE, get_mark_price, start_price_engine

app = Flask(__name__)
CORS(app)

@app.route('/api/prices', methods=['GET'])
def get_frontend_display_prices():
    display_prices = {}
    for asset, price in CLEAN_PRICE_CACHE.items():
        try:
            val = float(price)
            if val <= 0:
                continue
            fluctuation = val * random.uniform(-0.002, 0.002)
            display_prices[asset] = round(val + fluctuation, 4 if val < 10 else 2)
        except (TypeError, ValueError):
            continue

    return jsonify({
        "success": True,
        "prices": display_prices
    })

@app.route('/api/mark-price/<asset>', methods=['GET'])
def api_get_mark_price(asset):
    price = get_mark_price(asset)
    return jsonify({
        "success": True,
        "asset": asset,
        "markPrice": price
    })

def run_background_loop():
    """
    独立且受保护的异步事件循环驱动器
    """
    print("⚡ [后台线程] 事件循环线程已成功启动...")
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        # 运行异步引擎入口
        loop.run_until_complete(start_price_engine())
    except Exception as e:
        print(f"❌ [后台线程事件循环崩溃]: {e}")

if __name__ == '__main__':
    print("--- 🚀 模块化后端网关正在挂载价格引擎 ---")
    
    # 启动后台独立守护线程
    bg_thread = threading.Thread(target=run_background_loop, daemon=True)
    bg_thread.start()
    
    print("--- 🚀 Flask 网关开始监听端口 5001 ---")
    app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)