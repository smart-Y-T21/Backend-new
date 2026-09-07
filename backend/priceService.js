/**
 * 前端价格服务：从你的 Python 后端多源预言机网关获取实时价格
 */
const API_URL = 'http://127.0.0.1:5001/api/prices';

/**
 * 获取全网最新真实价格字典
 */
export async function fetchLivePrices() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    if (data.success && data.prices) {
      return data.prices; // 返回包含所有 91 种资产价格的字典
    }
    return {};
  } catch (error) {
    console.error("⚠️ 前端获取实时价格失败:", error.message);
    return {};
  }
}

/**
 * 获取指定标的的最新真实价格
 * @param {string} assetSymbol 资产代号，例如 'BTC', 'NVDA'
 * @param {object} pricesCache 当前的价格缓存字典
 */
export function getAssetPrice(assetSymbol, pricesCache) {
  if (pricesCache && pricesCache[assetSymbol] !== undefined) {
    return pricesCache[assetSymbol];
  }
  return 1.00; // 兜底值
}