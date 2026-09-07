import asyncio
import aiohttp
from backend.config import (
    TWELVE_DATA_KEY, 
    TWELVE_DATA_STOCK_GROUPS, 
    TWELVE_DATA_HK_GROUPS, 
    TWELVE_DATA_MACRO_GROUPS,
    TWELVE_DATA_EU_GROUPS,
)

# ==========================================
# 📦 全局纯净价格缓存池
# ==========================================
GLOBAL_PRICE_CACHE = {
    # 🌟 BTC 生态核心资产
    "BTC": 98245.5,
    "MSTR": 412.50,
    "IBIT": 38.20,
    "BITO": 21.45,
    "MARA": 22.40,
    "RIOT": 11.20,
    "CLSK": 14.80,
    "HUT": 18.50,
    "METAPLANET": 220.00,
    "USD_JPY_RATE": 150.00,

    # 🔷 以太坊生态核心资产
    "ETH": 2700.0, 
    "ETHE": 28.50, 
    "ETHA": 24.10, 
    "FETH": 21.80, 
    "BMNR": 18.82, 
    "BTBT": 4.50,

    # 主流加密资产
    "SOL": 180.0, "HYPE": 55.20, "DOGE": 0.38, "SEI": 0.6482, "SUI": 3.12,
    "NEAR": 5.45, "LINK": 18.20, "AVAX": 34.20, "APT": 11.85, "OP": 1.82,
    "ARB": 0.92, "TAO": 582.4, "BNB": 582.50, "XRP": 1.14, "ADA": 0.58,
    "RENDER": 8.42, "INJ": 24.10, "TIA": 6.25,
    
    # 美股与中概股
    "NVDA": 195.04, "TSLA": 308.85, "AAPL": 333.43, "MSFT": 448.20,
    "AMZN": 215.60, "GOOGL": 358.00, "META": 545.20, "COIN": 265.40,
    "NFLX": 712.00, "AMD": 162.10, "INTC": 22.40,
    "BABA": 92.50, "PDD": 128.40, "JD": 32.10, "BIDU": 94.50,
    "NIO": 5.20, "XPEV": 11.80, "LI": 26.50, "BILI": 21.40, "TME": 12.80,
    
    # 港股资产
    "HSI": 25120.00, "00001": 38.50, "00005": 68.20, "01299": 54.00,
    "00700": 412.00, "03690": 135.50, "01810": 28.40, "09988": 92.80,
    "00981": 26.50, "02015": 94.50, "09888": 88.50, "00388": 298.00,
    
    # 宏观与大宗商品
    "EUR/USD": 1.0890, "GBP/USD": 1.2840, "USD/JPY": 154.10,
    "AUD/USD": 0.6650, "USD/CHF": 0.8790, "NZD/USD": 0.6080, "USD/CAD": 1.3650,
    "USD/CNH": 6.74, "DXY": 99.9,
    "GOLD": 4260.00, "OIL": 78.40, "SILVER": 62.0,
    "PLATINUM": 1700.0, "PALLADIUM": 1400.0,
    
    # 全球 ETF
    "SPY": 595.20, "QQQ": 518.40, "IWM": 232.10, "ARKK": 58.40,
    "GLD": 378.50, "EWJ": 72.10, "VGK": 68.20, "MCHI": 31.40,
    "EWY": 58.20, "INDA": 56.40, "EWU": 36.50, "EWS": 25.80, "EWW": 65.20,
    
    # 欧股资产
    "ASML": 920.50, "LVMH": 740.00, "RMS": 2150.00, "ROG": 285.20,
    "NOVN": 98.40, "AZN": 124.50, "NOVO": 95.20, "NESN": 88.60,
    "SIE": 178.40, "SAP": 215.40, "SHEL": 34.20, "TTE": 62.10,
    "RACE": 410.00, "ALV": 275.50, "RHM": 580.00
}

CLEAN_PRICE_CACHE = GLOBAL_PRICE_CACHE
MARK_PRICE_CACHE = {}


# ==========================================
# 🌟 专题攻坚：比特币生态（BTC Eco）独立抓取引擎（含强日志调试）
# ==========================================
async def fetch_btc_eco_prices():
    us_btc_symbols = "MSTR,IBIT,BITO,MARA,RIOT,CLSK"
    ca_btc_symbols = "HUT.TO"
    jp_btc_symbols = "3350.T"

    async with aiohttp.ClientSession() as session:
        while True:
            try:
                # 1. 改用 CoinGecko 稳定获取 BTC 实时价格（完美避开币安 451 拦截）
                coingecko_btc_url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
                async with session.get(coingecko_btc_url, timeout=5) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if "bitcoin" in data and "usd" in data["bitcoin"]:
                            btc_val = float(data["bitcoin"]["usd"])
                            GLOBAL_PRICE_CACHE["BTC"] = btc_val
                            print(f"🔥 [BTC 成功] CoinGecko 实时比特币价格已更新: {btc_val}")

                # 2. 批量抓取美股 BTC 财库与 ETF
                us_url = f"https://api.twelvedata.com/price?symbol={us_btc_symbols}&apikey={TWELVE_DATA_KEY}"
                async with session.get(us_url, timeout=5) as resp:
                    if resp.status == 200:
                        us_data = await resp.json()
                        for symbol, val in us_data.items():
                            if isinstance(val, dict) and 'price' in val:
                                GLOBAL_PRICE_CACHE[symbol] = float(val['price'])
                            elif isinstance(val, (int, float, str)):
                                GLOBAL_PRICE_CACHE[symbol] = float(val)

                # 3. 抓取加股 HUT (映射自 HUT.TO)
                ca_url = f"https://api.twelvedata.com/price?symbol={ca_btc_symbols}&apikey={TWELVE_DATA_KEY}"
                async with session.get(ca_url, timeout=5) as resp:
                    if resp.status == 200:
                        ca_data = await resp.json()
                        if "HUT.TO" in ca_data and "price" in ca_data["HUT.TO"]:
                            GLOBAL_PRICE_CACHE["HUT"] = float(ca_data["HUT.TO"]["price"])

                # 4. 严谨处理日股 Metaplanet（日元原价转美元折算价）
                jp_url = f"https://api.twelvedata.com/price?symbol={jp_btc_symbols},USD/JPY&apikey={TWELVE_DATA_KEY}"
                async with session.get(jp_url, timeout=5) as resp:
                    if resp.status == 200:
                        jp_data = await resp.json()
                        jpy_rate = 150.0
                        if "USD/JPY" in jp_data and "price" in jp_data["USD/JPY"]:
                            jpy_rate = float(jp_data["USD/JPY"]["price"])
                            GLOBAL_PRICE_CACHE["USD_JPY_RATE"] = jpy_rate

                        if "3350.T" in jp_data and "price" in jp_data["3350.T"]:
                            jp_price_jpy = float(jp_data["3350.T"]["price"])
                            GLOBAL_PRICE_CACHE["METAPLANET_JPY"] = jp_price_jpy
                            GLOBAL_PRICE_CACHE["METAPLANET"] = round(jp_price_jpy / jpy_rate, 2)

                print("🟢 [BTC Eco专题通道] 同步完成！")
            except Exception as e:
                print(f"⚠️ [BTC Eco专题通道报错]: {e}")
            
            await asyncio.sleep(5)
# ==========================================
# ⚡ 板块 2：HYPE 专属实盘通道
# ==========================================
async def fetch_hype_price():
    url = "https://api.coingecko.com/api/v3/simple/price?ids=hyperliquid&vs_currencies=usd"
    async with aiohttp.ClientSession() as session:
        while True:
            try:
                async with session.get(url, timeout=5) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if 'hyperliquid' in data and 'usd' in data['hyperliquid']:
                            hype_val = float(data['hyperliquid']['usd'])
                            if hype_val > 0:
                                GLOBAL_PRICE_CACHE['HYPE'] = hype_val
            except Exception:
                pass
            await asyncio.sleep(5)

# ==========================================
# 🌟 专题攻坚：主流加密货币大盘独立抓取引擎（Twelve Data 工业级稳定通道）
# ==========================================
async def fetch_crypto_market_prices():
    """
    专门负责：SOL, SEI, SUI, NEAR, LINK, AVAX, APT, OP, ARB, TAO, BNB, XRP, ADA, RENDER, INJ, TIA, HYPE
    使用 Twelve Data 批量接口，稳定、抗网络阻断
    """
    # Twelve Data 的加密货币符号格式一般为 SOL/USD, XRP/USD 等
    crypto_symbols = "SOL/USD,SEI/USD,SUI/USD,NEAR/USD,LINK/USD,AVAX/USD,APT/USD,OP/USD,ARB/USD,TAO/USD,BNB/USD,XRP/USD,ADA/USD,RENDER/USD,INJ/USD,TIA/USD,HYPE/USD"

    async with aiohttp.ClientSession() as session:
        while True:
            try:
                url = f"https://api.twelvedata.com/price?symbol={crypto_symbols}&apikey={TWELVE_DATA_KEY}"
                async with session.get(url, timeout=6) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for key, val in data.items():
                            # key 的格式类似于 "SOL/USD"
                            symbol = key.split('/')[0] if '/' in key else key
                            if isinstance(val, dict) and 'price' in val:
                                GLOBAL_PRICE_CACHE[symbol] = float(val['price'])
                            elif isinstance(val, (int, float, str)):
                                GLOBAL_PRICE_CACHE[symbol] = float(val)
                        print("🔥 [加密货币大盘] Twelve Data 批量同步成功！")
            except Exception as e:
                print(f"⚠️ [加密货币大盘通道报错]: {e}")
            
            await asyncio.sleep(5)

# ==========================================
# 🔷 专题攻坚：以太坊生态（ETH Eco）独立抓取引擎
# ==========================================
async def fetch_eth_eco_prices():
    """
    专门服务于前端“ETH Eco”板块的独立、闭环抓取通道
    包含：ETH (CoinGecko直连，完美避开封锁) + 以太坊美股财库/ETF (SBET, ETHE, ETHA, FETH, BMNR, BTBT)
    """
    eth_stock_symbols = "SBET,ETHE,ETHA,FETH,BMNR,BTBT"

    async with aiohttp.ClientSession() as session:
        while True:
            try:
                # 1. 精准抓取 ETH 实时价格（使用 CoinGecko 稳定直连，完美避开 451 拦截）
                coingecko_eth_url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
                async with session.get(coingecko_eth_url, timeout=5) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if "ethereum" in data and "usd" in data["ethereum"]:
                            eth_val = float(data["ethereum"]["usd"])
                            GLOBAL_PRICE_CACHE["ETH"] = eth_val
                            print(f"🔥 [ETH 成功] CoinGecko 实时以太坊价格已更新: {eth_val}")

                # 2. 批量抓取以太坊生态美股财库与 ETF（包含 SBET, ETHE, ETHA, FETH, BMNR, BTBT）
                url = f"https://api.twelvedata.com/price?symbol={eth_stock_symbols}&apikey={TWELVE_DATA_KEY}"
                async with session.get(url, timeout=6) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for symbol, val in data.items():
                            if isinstance(val, dict) and 'price' in val:
                                try:
                                    GLOBAL_PRICE_CACHE[symbol] = float(val['price'])
                                    if symbol == "SBET":
                                        print(f"🔥 [SBET 成功] 美股ETH财库实时价格已更新: {val['price']}")
                                except:
                                    pass
                            elif isinstance(val, (int, float, str)):
                                try:
                                    GLOBAL_PRICE_CACHE[symbol] = float(val)
                                    if symbol == "SBET":
                                        print(f"🔥 [SBET 成功] 美股ETH财库实时价格已更新: {val}")
                                except:
                                    pass

                print("🟢 [ETH Eco 专题通道] 同步完成：ETH、SBET 及全套以太坊资产已独立对齐！")
            except Exception as e:
                print(f"⚠️ [ETH Eco 专题通道报错]: {e}")

            await asyncio.sleep(5)

# ==========================================
# 📈 板块 4：常规美股与 ETF 通道（含 INTC 专属特遣直连）
# ==========================================
async def fetch_stocks_prices():
    async with aiohttp.ClientSession() as session:
        while True:
            # 1. 独立特遣通道：针对容易卡顿的重点资产进行高频直连
            # 这样无论批量组怎么变，这几只核心中概股和英特尔都能实时更新
            for special_symbol in ["INTC", "PDD", "TCEHY"]:
                try:
                    url = f"https://api.twelvedata.com/price?symbol={special_symbol}&apikey={TWELVE_DATA_KEY}"
                    async with session.get(url, timeout=5) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            if isinstance(data, dict) and 'price' in data:
                                GLOBAL_PRICE_CACHE[special_symbol] = float(data['price'])
                            elif special_symbol in data:
                                val = data[special_symbol]
                                if isinstance(val, dict) and 'price' in val:
                                    GLOBAL_PRICE_CACHE[special_symbol] = float(val['price'])
                                elif isinstance(val, (int, float, str)):
                                    GLOBAL_PRICE_CACHE[special_symbol] = float(val)
                except Exception:
                    pass

            # 2. 正常按组批量抓取其他常规美股、中概股与 ETF
            for group in TWELVE_DATA_STOCK_GROUPS:
                try:
                    url = f"https://api.twelvedata.com/price?symbol={group}&apikey={TWELVE_DATA_KEY}"
                    async with session.get(url, timeout=5) as resp:
                        if resp.status == 200:
                            stock_data = await resp.json()
                            for symbol, val in stock_data.items():
                                if isinstance(val, dict) and 'price' in val:
                                    GLOBAL_PRICE_CACHE[symbol] = float(val['price'])
                                elif isinstance(val, (int, float, str)):
                                    GLOBAL_PRICE_CACHE[symbol] = float(val)
                except Exception:
                    pass
                await asyncio.sleep(0.3)
            
            await asyncio.sleep(5)


# ==========================================
# 🇭🇰 港股最终正确通道（exchange=HKEX + 标准前导零符号）
# ==========================================
async def fetch_hk_prices():
    # 格式: (官方标准带前导零符号, 前端映射Key)
    hk_targets = [
        ("00001", "00001"),  # 长和
        ("00005", "00005"),  # 汇丰控股
        ("00388", "00388"),  # 香港交易所
        ("00700", "00700"),  # 腾讯控股
        ("00981", "00981"),  # 中芯国际
        ("01299", "01299"),  # 友邦保险
        ("01810", "01810"),  # 小米集团
        ("03690", "03690"),  # 美团
        ("09888", "09888"),  # 百度集团
        ("09988", "09988")   # 阿里巴巴
    ]

    await asyncio.sleep(7)

    async with aiohttp.ClientSession() as session:
        while True:
            for symbol, target_key in hk_targets:
                try:
                    url = "https://api.twelvedata.com/price"
                    params = {
                        "symbol": symbol,
                        "exchange": "HKEX",  # 👈 完美对齐官方数据库的 HKEX
                        "apikey": TWELVE_DATA_KEY
                    }
                    async with session.get(url, params=params, timeout=4) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            if "code" in data and data.get("code") != 200:
                                print(f"❌ [港股 API 报错] 代码: {symbol}, 原因: {data.get('message')}")
                            elif "price" in data:
                                price_val = float(data["price"])
                                if price_val > 0:
                                    GLOBAL_PRICE_CACHE[target_key] = price_val
                                    print(f"🟢 [港股实时更新成功] {target_key} -> {price_val}")
                        else:
                            print(f"⚠️ [港股网络异常] 代码: {symbol}, HTTP状态码: {resp.status}")
                except Exception as e:
                    print(f"⚠️ [港股请求异常] 代码: {symbol}, 详情: {e}")
                
                await asyncio.sleep(0.4)
            
            # 整轮更新完毕后休息 20 秒
            await asyncio.sleep(20)

# ==========================================
# 🇪🇺 欧股独立隔离通道（完美参数分离版，绝对不影响 BTC）
# ==========================================

async def fetch_eu_prices():
    # 使用 Twelve Data 文档推荐的 mic_code（市场标识码）进行精确查验
    # 格式: (股票代码, 市场标识码 mic_code, 前端映射Key)
    eu_targets = [
        ("ASML",   "XAMS",     "ASML"),
        ("MC",     "XPAR",     "LVMH"),
        ("RMS",    "XPAR",     "RMS"),
        ("ROG.SW", "",         "ROG"),     # 罗氏：改用 .SW 后缀直查
        ("NOVN",   "XSWX",     "NOVN"),
        ("AZN.L",  "",         "AZN"),     # 阿斯利康：改用 .L 后缀直查（伦敦）
        ("NOVO-B.CO", "",      "NOVO"),    # 诺和诺德：改用 .CO 后缀直查（哥本哈根）
        ("NESN",   "XSWX",     "NESN"),
        ("SIE",    "XETR",     "SIE"),
        ("SAP",    "XETR",     "SAP"),
        ("SHEL.L", "",         "SHEL"),    # 壳牌：改用 .L 后缀直查（伦敦主挂牌）
        ("TTE",    "XPAR",     "TTE"),
        ("RACE.MI","",         "RACE"),    # 法拉利：改用 .MI 后缀直查（米兰）
        ("ALV",    "XETR",     "ALV"),
        ("RHM",    "XETR",     "RHM")
    ]

    await asyncio.sleep(5)

    async with aiohttp.ClientSession() as session:
        while True:
            for symbol, mic, target_key in eu_targets:
                try:
                    url = "https://api.twelvedata.com/price"
                    params = {
                        "symbol": symbol,
                        "mic_code": mic,  # 👈 严格按照官方文档使用 mic_code 参数
                        "apikey": TWELVE_DATA_KEY
                    }
                    async with session.get(url, params=params, timeout=4) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            if "price" in data:
                                price_val = float(data["price"])
                                if price_val > 0:
                                    GLOBAL_PRICE_CACHE[target_key] = price_val
                except Exception:
                    pass
                
                await asyncio.sleep(0.4)
            
            await asyncio.sleep(20)
            
# ==========================================
# 🌐 板块 6：宏观资产通道
# ==========================================
async def fetch_macro_prices():
    macro_mapping = {
        "USD/CNH": "USD/CNH", "DXY": "DXY", "XAU/USD": "GOLD",
        "WTI/USD": "OIL", "XAG/USD": "SILVER", "XPT/USD": "PLATINUM", "XPD/USD": "PALLADIUM"
    }
    async with aiohttp.ClientSession() as session:
        while True:
            for group in TWELVE_DATA_MACRO_GROUPS:
                try:
                    url = f"https://api.twelvedata.com/price?symbol={group}&apikey={TWELVE_DATA_KEY}"
                    async with session.get(url, timeout=5) as resp:
                        if resp.status == 200:
                            macro_data = await resp.json()
                            for symbol, val in macro_data.items():
                                if isinstance(val, dict) and 'price' in val:
                                    price_val = float(val['price'])
                                    target_key = macro_mapping.get(symbol, symbol)
                                    GLOBAL_PRICE_CACHE[target_key] = price_val
                except Exception:
                    pass
                await asyncio.sleep(0.3)
            await asyncio.sleep(5)

# ==========================================
# ⚖️ 清算标记价格同步引擎
# ==========================================
async def update_mark_prices_loop():
    while True:
        for asset, raw_val in GLOBAL_PRICE_CACHE.items():
            if raw_val > 0:
                MARK_PRICE_CACHE[asset] = raw_val
        await asyncio.sleep(1)

# ==========================================
# 🚀 启动所有板块独立价格引擎任务
# ==========================================
async def start_price_engine():
    print("🚀 【分板块独立隔离】行情价格引擎正在挂载所有通道...")
    await asyncio.gather(
        fetch_btc_eco_prices(),        # 🔥 专属特供：比特币生态大拼盘通道
        fetch_crypto_market_prices(),  # 🌟 升级后的主流加密货币大盘批量通道
        fetch_eth_eco_prices(),        # 🔷 升级后的以太坊生态专属通道
        fetch_stocks_prices(),
        fetch_hk_prices(),
        fetch_macro_prices(),
        fetch_eu_prices(),
        update_mark_prices_loop()
    )

def get_clean_price(asset):
    return GLOBAL_PRICE_CACHE.get(asset, 0.0)

def get_mark_price(asset):
    return MARK_PRICE_CACHE.get(asset, 0.0)