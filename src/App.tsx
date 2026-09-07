import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, INITIAL_ASSETS } from './contractConfig';
import type { AssetConfig } from './contractConfig';

interface Position {
  name: string;
  side: string;
  size: number;
  lev: number;
  entry: number;
  lp: number;
  mg: number;
}

interface MakerOrder {
  asset: string;
  isLong: boolean;
  size: number;
  price: number;
}

interface ModalProps { 
  open: boolean; 
  stat: string; 
  side: string; 
  selName: string; 
  selPrice: number; 
  onClose: () => void; 
}

const OrderModal: React.FC<ModalProps> = ({ open, stat, side, selName, selPrice, onClose }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2, 2, 4, 0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '320px', backgroundColor: '#09090e', border: '1px solid #161622', borderRadius: '6px', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '9px', marginBottom: '16px', color: '#64748b', fontWeight: 'bold', letterSpacing: '1px' }}>BRIDGE-LAB TESTNET CORE</div>
        {stat === 'loading' ? (
          <>
            <div style={{ width: '28px', height: '28px', border: '2px solid #020204', borderTop: `2px solid ${side==='buy'?'#00f2fe':'#ff007f'}`, borderRadius: '50%', margin: '20px auto', animation: 'spin 0.8s linear infinite' }}></div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: side==='buy'?'#00f2fe':'#ff007f' }}>BROADCASTING TO SEI TESTNET...</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00f2fe', marginBottom: '12px' }}>✓ BLOCK MINED ON SEI CHAIN</div>
            <div style={{ color: '#94a3b8', fontSize: '10px', lineHeight: '1.7', marginBottom: '20px', textAlign: 'left', backgroundColor: '#020204', padding: '12px', border: '1px solid #161622', borderRadius: '4px' }}>
              Status: 1 (EVM Success)<br />Market: {selName}-PERP<br />Price: {Math.round(selPrice)} USDC
            </div>
          </>
        )}
        <button onClick={onClose} style={{ backgroundColor: '#161622', border: '1px solid #1e293b', color: '#94a3b8', padding: '6px 20px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>CLOSE</button>
      </div>
    </div>
  );
};

export default function App() {
  const [side, setSide] = useState<string>('buy');
  const [mode, setMode] = useState<string>('Cross'); 
  const [lev, setLev] = useState<number>(20);
  const [size, setSize] = useState<number>(1);
  const [open, setOpen] = useState<boolean>(false);
  const [stat, setStat] = useState<string>('loading');
  const [q, setQ] = useState<string>('');
  
  const [account, setAccount] = useState<string | null>(null);
  const [margin, setMargin] = useState<string>("Not Connected");
  const [pos, setPos] = useState<Position[]>([]); 
  const [assets, setAssets] = useState<AssetConfig[]>(INITIAL_ASSETS);
  const [sel, setSel] = useState<AssetConfig>(INITIAL_ASSETS[0]);
  const [isActivating, setIsActivating] = useState<boolean>(false);

  const [makerOrders, setMakerOrders] = useState<MakerOrder[]>([]);

  const connectWallet = async () => {
    const eth = (window as any).ethereum;
    if (!eth) { alert("❌ MetaMask wallet not detected!"); return; }
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      }
    } catch (err: any) { 
      alert(`Connection error: ${err.message || err}`); 
    }
  };

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (eth) {
      eth.request({ method: 'eth_accounts' }).then((accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) setAccount(accs[0]);
      }).catch((err: any) => console.error(err));
      eth.on('accountsChanged', (accounts: string[]) => { setAccount(accounts[0] || null); });
      eth.on('chainChanged', () => { window.location.reload(); });
    }
  }, []);

  const fetchMargin = async () => {
    if (!account) { setMargin("Not Connected"); return; }
    try {
      const eth = (window as any).ethereum;
      if (!eth) return;
      const p = new ethers.BrowserProvider(eth);
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, p);
      const b = await c.getMargin(account);
      setMargin(ethers.formatEther(b) + " USDC");
    } catch (e) { setMargin("Chain Error"); }
  };

  const fetchPositions = async () => {
    if (!account) return;
    try {
      const eth = (window as any).ethereum;
      if (!eth) return;
      const p = new ethers.BrowserProvider(eth);
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, p);
      
      const loadedPositions: Position[] = [];
      for (let i = 0; i < 5; i++) {
        try {
          const rawPos = await c.userPositions(account, i);
          if (rawPos && rawPos.size && rawPos.size > 0n && rawPos.asset) {
            const sizeNum = Number(ethers.formatEther(rawPos.size)) || 0;
            const entryNum = Number(ethers.formatEther(rawPos.entryPrice)) || 0;
            const marginNum = Number(ethers.formatEther(rawPos.marginPaid)) || 0;
            const leverageNum = Number(rawPos.leverage) || 1;
            const computedLp = entryNum * (rawPos.isLong ? (1 - 0.9 / leverageNum) : (1 + 0.9 / leverageNum));

            loadedPositions.push({
              name: rawPos.asset,
              side: rawPos.isLong ? 'buy' : 'sell',
              size: sizeNum,
              lev: leverageNum,
              entry: entryNum,
              lp: isNaN(computedLp) ? entryNum : computedLp,
              mg: marginNum
            });
          }
        } catch (err) { break; }
      }
      setPos(loadedPositions);
    } catch (e) { console.error(e); }
  };

  const fetchMakerOrders = async () => {
    try {
      const eth = (window as any).ethereum;
      if (!eth) return;
      const p = new ethers.BrowserProvider(eth);
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, p);
      const makerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const orders = await c.getMakerPositions(makerAddress);
      
      if (orders && orders.length > 0) {
        setMakerOrders(orders.map((o: any) => ({
          asset: String(o.asset).trim(),
          isLong: o.isLong,
          size: Number(ethers.formatEther(o.size)),
          price: Number(ethers.formatEther(o.entryPrice)),
        })));
      } else {
        setMakerOrders([]);
      }
    } catch (e) { /* silent catch */ }
  };

  useEffect(() => { 
    fetchMargin(); 
    fetchPositions();
    fetchMakerOrders();
    const t = setInterval(fetchMakerOrders, 3000);
    return () => clearInterval(t);
  }, [account]);

  useEffect(() => {
    const t = setInterval(() => {
      setAssets((prev: AssetConfig[]) => prev.map(a => {
        const pct = (Math.random() * 0.0016 - 0.0008);
        return { ...a, price: Number((a.price * (1 + pct)).toFixed(a.price>1000?1:a.price<0.1?7:4)), change: Number((a.change+(pct*100)).toFixed(2)), up: pct>=0 };
      }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const f = assets.find(a => a.name === sel.name);
    if (f) setSel(f);
  }, [assets, sel.name]);

  const handleDeposit = async () => {
    if (!account) { alert("Please connect wallet first!"); return; }
    setIsActivating(true);
    try {
      const eth = (window as any).ethereum;
      const p = new ethers.BrowserProvider(eth);
      const s = await p.getSigner();
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s);
      const tx = await c.depositRegister({ value: ethers.parseEther("0.1") });
      await tx.wait(); 
      alert("✅ Margin deposited successfully!");
      await fetchMargin(); await fetchPositions();
    } catch (e: any) {
      alert(`Deposit error: ${e.reason || e.message}`);
    } finally { setIsActivating(false); }
  };

  const handleOrder = async () => {
    if (!account) { alert("❌ Order failed: Please connect wallet first!"); return; }
    setStat('loading'); setOpen(true);
    const is = Math.floor(Number(size)) || 1;
    const roundedEntry = Math.round(sel.price);

    try {
      const eth = (window as any).ethereum;
      const p = new ethers.BrowserProvider(eth);
      const s = await p.getSigner();
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s);

      const tx = await c.placeOrder(sel.name, side === 'buy', ethers.parseEther(is.toString()), ethers.parseEther(roundedEntry.toString()), lev);
      await tx.wait(); 
      setStat('success');
      setTimeout(() => { fetchMargin(); fetchPositions(); }, 1500);
    } catch (e: any) { 
      setOpen(false);
      alert(`Transaction Error: ${e.reason || e.message || JSON.stringify(e)}`);
    }
  };

  const handleClosePosition = async (idx: number) => {
    setStat('loading'); setOpen(true);
    try {
      const eth = (window as any).ethereum;
      const p = new ethers.BrowserProvider(eth);
      const s = await p.getSigner();
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s);
      const tx = await c.closePosition(idx);
      await tx.wait();
      setStat('success');
      setTimeout(() => { fetchMargin(); fetchPositions(); }, 1000);
    } catch (e: any) {
      setOpen(false);
      alert(`Close failed: ${e.reason || e.message}`);
    }
  };

  const getPnL = (p: Position) => {
    const ca = assets.find(a => a.name === p.name);
    if (!ca) return { pnl: 0, roe: 0, cp: p.entry };
    const pnl = p.side === 'buy' ? (ca.price - p.entry) * p.size : (p.entry - ca.price) * p.size;
    return { pnl: Number(pnl.toFixed(2)), roe: Number((p.mg > 0 ? (pnl / p.mg) * 100 : 0).toFixed(2)), cp: ca.price };
  };

  const currentAssetOrders = makerOrders.filter(o => o.asset.toUpperCase() === sel.name.toUpperCase());
  const sellOrders = currentAssetOrders.filter(o => !o.isLong).sort((a, b) => a.price - b.price).slice(0, 8); 
  const buyOrders = currentAssetOrders.filter(o => o.isLong).sort((a, b) => b.price - a.price).slice(0, 8);   
  const maxSellSize = Math.max(...sellOrders.map(o => o.size), 1);
  const maxBuySize = Math.max(...buyOrders.map(o => o.size), 1);

  return (
    <div style={{ backgroundColor: '#040406', color: '#e2e8f0', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', fontFamily: 'monospace' }}>
      
      {/* 头部：BRIDGE-LAB DEX 品牌标识 */}
      <header style={{ height: '38px', backgroundColor: '#09090e', borderBottom: '1px solid #161622', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: '#00f2fe', fontWeight: 900, fontSize: '13px', letterSpacing: '2px', textShadow: '0 0 12px rgba(0,242,254,0.4)' }}>BRIDGE-LAB DEX</div>
          <span style={{ color: '#00f2fe', fontSize: '8px', border: '1px solid rgba(0,242,254,0.4)', padding: '1px 6px', borderRadius: '2px', fontWeight: 'bold' }}>SEI TESTNET v2</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: '#64748b', fontSize: '9px' }}>Margin: <strong style={{ color: '#00f2fe' }}>{margin}</strong></div>
        </div>
      </header>

      {/* 🌟 粉蓝色高亮悬浮钱包连接按钮 */}
      <div style={{ position: 'fixed', top: '5px', right: '16px', zIndex: 99999 }}>
        <button onClick={connectWallet} style={{ backgroundColor: account ? 'rgba(0,242,254,0.15)' : '#00f2fe', color: account ? '#00f2fe' : '#000', border: '2px solid #00f2fe', fontSize: '12px', padding: '6px 18px', cursor: 'pointer', borderRadius: '4px', fontWeight: 900, boxShadow: '0 0 15px rgba(0,242,254,0.3)' }}>
          {account ? `🟢 ${account.slice(0, 6)}...${account.slice(-4)}` : "⚡️ CONNECT WALLET"}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', width: '100%' }}>
        
        {/* 左侧资产列表：带分类浅色背景区分 */}
        <div style={{ width: '19%', borderRight: '1px solid #161622', backgroundColor: '#07070c', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #161622' }}>
            <input type="text" placeholder="Search Assets..." value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', backgroundColor: '#020204', border: '1px solid #1e293b', borderRadius: '4px', color: '#fff', padding: '5px 10px', fontSize: '10px', outline: 'none' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #161622', color: '#64748b', height: '24px', backgroundColor: '#09090e' }}>
                  <th style={{ textAlign: 'left', padding: '4px 12px' }}>ASSET</th>
                  <th style={{ textAlign: 'right', padding: '4px 12px' }}>PRICE</th>
                  <th style={{ textAlign: 'right', padding: '4px 12px' }}>24H CHG</th>
                </tr>
              </thead>
              <tbody>
                {assets.filter(item => item.name.toLowerCase().includes(q.toLowerCase())).map((asset, index) => {
                  const rowBg = asset.category === 'Stock' 
                    ? (sel.name === asset.name ? 'rgba(255,0,127,0.08)' : '#0c0a09') 
                    : (sel.name === asset.name ? 'rgba(0,242,254,0.06)' : '#07070c');

                  return (
                    <tr key={index} onClick={() => setSel(asset)} style={{ borderBottom: '1px solid #0d0d15', cursor: 'pointer', backgroundColor: rowBg }}>
                      <td style={{ padding: '7px 12px', color: sel.name === asset.name ? '#00f2fe' : '#f1f5f9' }}>
                        <strong>{asset.name}</strong>
                        <span style={{ marginLeft: '6px', color: asset.category === 'Stock' ? '#d97706' : '#64748b', fontSize: '7px', border: '1px solid #1e293b', padding: '0 3px', borderRadius: '2px' }}>{asset.category}</span>
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: asset.up ? '#00f2fe' : '#ff007f', fontWeight: 700 }}>{asset.price.toLocaleString()}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: asset.change >= 0 ? '#00f2fe' : '#ff007f' }}>{asset.change >= 0 ? `+${asset.change.toFixed(2)}%` : `${asset.change.toFixed(2)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 中间主区域 */}
        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #161622', backgroundColor: '#020204', height: '100%', overflow: 'hidden' }}>
          <div style={{ height: '62%', minHeight: '220px', borderBottom: '1px solid #161622', backgroundColor: '#05050a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '2px', marginBottom: '8px' }}>{sel.name}-PERP ON-CHAIN MARK PRICE</div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: sel.up ? '#00f2fe' : '#ff007f', marginBottom: '8px' }}>
              {sel.price.toLocaleString()} <span style={{ fontSize: '14px', color: '#64748b' }}>USDC</span>
            </div>
            <div style={{ fontSize: '12px', color: sel.change >= 0 ? '#00f2fe' : '#ff007f', backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '4px', border: '1px solid #161622' }}>
              24h Change: {sel.change >= 0 ? `+${sel.change.toFixed(2)}%` : `${sel.change.toFixed(2)}%`}
            </div>
          </div>
          
          <div style={{ flex: 1, padding: '10px', overflowY: 'auto', backgroundColor: '#040406' }}>
            <div style={{ color: '#00f2fe', fontSize: '9px', fontWeight: 800, marginBottom: '6px' }}>ACTIVE POSITIONS ({pos.length})</div>
            {pos.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '10px', textAlign: 'center', marginTop: '30px' }}>No active on-chain positions.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ color: '#64748b', borderBottom: '1px solid #161622', height: '20px', fontSize: '9px' }}>
                    <th style={{ textAlign: 'left' }}>MARKET</th><th style={{ textAlign: 'center' }}>SIDE</th><th style={{ textAlign: 'right' }}>SIZE</th><th style={{ textAlign: 'right' }}>ENTRY</th><th style={{ textAlign: 'right' }}>UNREALIZED PNL (USDC)</th><th style={{ textAlign: 'right' }}>LIQ. PRICE</th><th style={{ textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map((p, idx) => {
                    const { pnl, roe } = getPnL(p); 
                    const prof = pnl >= 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #161622', height: '32px' }}>
                        <td style={{ color: '#fff' }}><strong>{p.name}-PERP</strong> <span style={{ color: '#64748b', fontSize: '8px' }}>{p.lev}x</span></td>
                        <td style={{ textAlign: 'center', color: p.side === 'buy' ? '#00f2fe' : '#ff007f', fontWeight: 'bold' }}>{p.side === 'buy' ? 'LONG' : 'SHORT'}</td>
                        <td style={{ textAlign: 'right', color: '#f8fafc' }}>{p.size}</td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>{p.entry}</td>
                        <td style={{ textAlign: 'right', color: prof ? '#00f2fe' : '#ff007f', fontWeight: 'bold' }}>{prof ? `+${pnl}` : pnl} ({prof ? `+${roe}` : roe}%)</td>
                        <td style={{ textAlign: 'right', color: '#ff007f', fontWeight: 'bold' }}>{p.lp ? p.lp.toFixed(1) : '0.0'}</td>
                        <td style={{ textAlign: 'center' }}><button onClick={() => handleClosePosition(idx)} style={{ backgroundColor: 'rgba(255,0,127,0.05)', border: '1px solid rgba(255,0,127,0.2)', borderRadius: '3px', color: '#ff007f', padding: '2px 8px', fontSize: '9px', cursor: 'pointer', fontWeight: 'bold' }}>CLOSE</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 右侧面板 */}
        <div style={{ width: '36%', backgroundColor: '#07070c', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #161622', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#07070c' }}>
            
            <button onClick={handleDeposit} disabled={isActivating} style={{ width: '100%', padding: '9px', border: 'none', borderRadius: '4px', fontWeight: 900, cursor: 'pointer', fontSize: '11px', backgroundColor: '#00f2fe', color: '#000', boxShadow: '0 0 10px rgba(0,242,254,0.2)' }}>
              {isActivating ? "⏳ DEPOSITING..." : "⚡️ DEPOSIT MARGIN (0.1 SEI)"}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#020204', padding: '3px 6px', borderRadius: '4px', border: '1px solid #161622' }}>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button onClick={() => setMode('Cross')} style={{ background: mode === 'Cross' ? '#161622' : 'none', border: 'none', borderRadius: '3px', color: mode === 'Cross' ? '#fff' : '#64748b', padding: '3px 8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '10px' }}>Limit/Market</button>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => setSide('buy')} style={{ backgroundColor: side === 'buy' ? '#00f2fe' : 'transparent', color: side === 'buy' ? '#000' : '#64748b', border: 'none', padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px' }}>BUY / LONG</button>
                <button onClick={() => setSide('sell')} style={{ backgroundColor: side === 'sell' ? '#ff007f' : 'transparent', color: side === 'sell' ? '#fff' : '#64748b', border: 'none', padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px' }}>SELL / SHORT</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ color: '#64748b', fontSize: '8px', fontWeight: 'bold' }}>ORDER SIZE</div>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#020204', border: '1px solid #161622', borderRadius: '4px', padding: '6px 10px' }}>
                <input type="number" style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '70%', fontWeight: 700, fontSize: '13px' }} value={size} onChange={(e) => setSize(Math.max(1, Number(e.target.value) || 1))} />
                <span style={{ color: '#64748b', fontSize: '10px', marginLeft: 'auto', fontWeight: 'bold' }}>{sel.name}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '8px', fontWeight: 'bold' }}><span>LEVERAGE</span><span style={{ color: '#fff' }}>{lev}.0x</span></div>
              <input type="range" min="1" max="50" value={lev} onChange={(e) => setLev(Number(e.target.value))} style={{ width: '100%', height: '3px', accentColor: side === 'buy' ? '#00f2fe' : '#ff007f', cursor: 'pointer', backgroundColor: '#161622' }} />
            </div>
          </div>

          {/* 📊 Hyperliquid 风格三栏阶梯深度订单薄 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#07070c', overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid #161622', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>
              <span>ORDER BOOK</span>
              <span style={{ color: '#00f2fe' }}>0.001 ▾</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '4px 8px' }}>
              
              {/* 三栏表头 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#64748b', paddingBottom: '2px', borderBottom: '1px solid #161622' }}>
                <span>Price</span>
                <span>Size ({sel.name})</span>
                <span>Total ({sel.name})</span>
              </div>

              {/* Asks (卖单 - 从高到低) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '1px', overflowY: 'auto', paddingBottom: '2px' }}>
                {sellOrders.length === 0 ? (
                  <div style={{ color: '#334155', textAlign: 'center', fontSize: '9px' }}>No Maker Asks</div>
                ) : (
                  (() => {
                    let runningTotal = 0;
                    return sellOrders.map((o, idx) => {
                      runningTotal += o.size;
                      const depthPercent = Math.min(100, (runningTotal / (maxSellSize * sellOrders.length || 1)) * 100);
                      return (
                        <div key={idx} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 4px', zIndex: 1 }}>
                          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `${depthPercent}%`, backgroundColor: 'rgba(255, 0, 127, 0.15)', zIndex: -1, borderRadius: '1px' }}></div>
                          <span style={{ color: '#ff007f', fontWeight: 700 }}>{o.price.toFixed(2)}</span>
                          <span style={{ color: '#94a3b8' }}>{o.size.toFixed(2)}</span>
                          <span style={{ color: '#e2e8f0' }}>{runningTotal.toFixed(2)}</span>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Mark Price 中间盘口 */}
              <div style={{ backgroundColor: '#111119', padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #161622', borderBottom: '1px solid #161622', margin: '4px 0' }}>
                <span style={{ color: '#64748b', fontSize: '8px' }}>Spread 0.1</span>
                <span style={{ color: sel.up ? '#00f2fe' : '#ff007f', fontWeight: 900, fontSize: '11px' }}>{sel.price.toLocaleString()} USDC</span>
              </div>

              {/* Bids (买单 - 从高到低累加) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '1px', overflowY: 'auto', paddingTop: '2px' }}>
                {buyOrders.length === 0 ? (
                  <div style={{ color: '#334155', textAlign: 'center', fontSize: '9px' }}>No Maker Bids</div>
                ) : (
                  (() => {
                    let runningTotal = 0;
                    return buyOrders.map((o, idx) => {
                      runningTotal += o.size;
                      const depthPercent = Math.min(100, (runningTotal / (maxBuySize * buyOrders.length || 1)) * 100);
                      return (
                        <div key={idx} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 4px', zIndex: 1 }}>
                          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `${depthPercent}%`, backgroundColor: 'rgba(0, 242, 254, 0.15)', zIndex: -1, borderRadius: '1px' }}></div>
                          <span style={{ color: '#00f2fe', fontWeight: 700 }}>{o.price.toFixed(2)}</span>
                          <span style={{ color: '#94a3b8' }}>{o.size.toFixed(2)}</span>
                          <span style={{ color: '#e2e8f0' }}>{runningTotal.toFixed(2)}</span>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

            </div>

            {/* 下单大按钮 */}
            <div style={{ padding: '10px', backgroundColor: '#07070c', borderTop: '1px solid #161622' }}>
              <button onClick={handleOrder} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '4px', fontWeight: 900, cursor: 'pointer', fontSize: '12px', backgroundColor: side === 'buy' ? '#00f2fe' : '#ff007f', color: side === 'buy' ? '#000' : '#fff' }}>
                PLACE {side === 'buy' ? 'LONG (BUY)' : 'SHORT (SELL)'} ORDER
              </button>
            </div>
          </div>

        </div>
      </div>
      <OrderModal open={open} stat={stat} side={side} selName={sel.name} selPrice={sel.price} onClose={() => setOpen(false)} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}