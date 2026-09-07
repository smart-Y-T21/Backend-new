import React, { useState } from 'react';

export default function PartnerDashboard() {
  // 战略贡献者数据（初期搭台资源支持者）
  const contributors = {
    contributorA: { name: "战略贡献者 A (资源/渠道)", allocation: 27500000, claimed: 0, avatar: "🏛️" },
    contributorB: { name: "战略贡献者 B (生态/做市)", allocation: 27500000, claimed: 0, avatar: "🌐" }
  };

  const [currentAccount, setCurrentAccount] = useState('contributorA');
  const [monthsPassed, setMonthsPassed] = useState(6); // 默认在第6个月（悬崖期内）
  const [isClaimed, setIsClaimed] = useState(false);

  const data = contributors[currentAccount];

  // 解锁计算逻辑：12个月Cliff，之后48个月线性释放
  const totalMonths = 48;
  const cliffMonths = 12;
  
  let unlockedAmount = 0;
  if (monthsPassed >= cliffMonths) {
    unlockedAmount = Math.floor((data.allocation * monthsPassed) / totalMonths);
  }
  const claimableAmount = unlockedAmount - data.claimed;

  const handleClaim = () => {
    if (claimableAmount <= 0) return;
    alert(`成功从链上解锁合约提取了 ${claimableAmount.toLocaleString()} 枚 $PROJ！`);
    data.claimed += claimableAmount;
    setIsClaimed(!isClaimed);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono select-none">
      {/* 顶部标题栏：致敬 BridgeLab 风格 */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-8">
        <div className="flex items-center space-x-3">
          <span className="text-[#ff4596] font-bold text-xl tracking-wider">BridgeLab@Yuan</span>
          <span className="text-xs px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-400">🗝️ 战略贡献者锁仓看板</span>
        </div>
        
        {/* 贡献者身份切换 */}
        <div className="flex space-x-2">
          {Object.keys(contributors).map((key) => (
            <button
              key={key}
              onClick={() => setCurrentAccount(key)}
              className={`px-3 py-1.5 text-xs font-bold transition-all border ${
                currentAccount === key
                  ? 'bg-[#ff4596] text-black border-[#ff4596]'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
              }`}
            >
              {contributors[key].avatar} {key === 'contributorA' ? '贡献者 A' : '贡献者 B'}
            </button>
          ))}
        </div>
      </div>

      {/* 核心指标卡片区 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0c0c0e] border border-zinc-800 p-4">
          <div className="text-zinc-500 text-xs mb-1">初期资源总份额 (5.5%)</div>
          <div className="text-xl font-bold text-white">{data.allocation.toLocaleString()} <span className="text-xs text-[#ff4596]">$PROJ</span></div>
        </div>
        <div className="bg-[#0c0c0e] border border-zinc-800 p-4">
          <div className="text-zinc-500 text-xs mb-1">当前已解锁 (Unlocked)</div>
          <div className="text-xl font-bold text-[#ff4596]">{unlockedAmount.toLocaleString()} <span className="text-xs text-zinc-400">$PROJ</span></div>
        </div>
        <div className="bg-[#0c0c0e] border border-zinc-800 p-4">
          <div className="text-zinc-500 text-xs mb-1">可随时提现 (Claimable)</div>
          <div className="text-xl font-bold text-emerald-400">{claimableAmount.toLocaleString()} <span className="text-xs text-zinc-400">$PROJ</span></div>
        </div>
        <div className="bg-[#0c0c0e] border border-zinc-800 p-4 flex flex-col justify-between">
          <div className="text-zinc-500 text-xs">链上合约状态</div>
          <div className="text-xs text-emerald-400 flex items-center mt-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></span>
            Vesting Contract 正常运行
          </div>
        </div>
      </div>

      {/* 锁仓进度与时间模拟器 */}
      <div className="bg-[#0c0c0e] border border-zinc-800 p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-200">锁仓与线性释放时间轴 (Strategic Vesting Timeline)</h2>
            <p className="text-xs text-zinc-500 mt-0.5">规则：12个月悬崖期 (Cliff) 零释放，之后48个月匀速线性释放</p>
          </div>
          <div className="text-sm font-bold text-[#ff4596]">
            当前模拟进度: 第 {monthsPassed} 个月 / 共 48 个月
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-full bg-zinc-900 h-3 border border-zinc-800 mb-6 relative overflow-hidden">
          <div 
            className="bg-[#ff4596] h-full transition-all duration-300"
            style={{ width: `${(monthsPassed / totalMonths) * 100}%` }}
          ></div>
        </div>

        {/* 拖动条调整月份 */}
        <div className="flex items-center space-x-4">
          <span className="text-xs text-zinc-500">模拟时间推进:</span>
          <input 
            type="range" 
            min="0" 
            max="48" 
            value={monthsPassed} 
            onChange={(e) => setMonthsPassed(Number(e.target.value))}
            className="w-full accent-[#ff4596] cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600 mt-2">
          <span>M0 (搭台起步)</span>
          <span className="text-[#ff4596]">M12 (悬崖期结束/首批解锁)</span>
          <span>M24 (两年)</span>
          <span>M48 (完全解锁)</span>
        </div>
      </div>

      {/* 底部操作与合约明细 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0c0c0e] border border-zinc-800 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">代币领取操作</h3>
            <p className="text-xs text-zinc-500 mb-4">
              {monthsPassed < 12 
                ? "🔒 当前处于 12 个月悬崖期 (Cliff) 内，所有代币安全锁在链上合约中，保障初期搭台资源稳固。" 
                : "🔓 悬崖期已过，您可随时将已解锁的代币提现至您的个人 Web3 钱包。"}
            </p>
          </div>
          <button 
            onClick={handleClaim}
            disabled={claimableAmount <= 0}
            className={`w-full py-3 text-xs font-bold uppercase transition-all tracking-wider ${
              claimableAmount > 0 
                ? 'bg-[#ff4596] text-black hover:opacity-90 cursor-pointer' 
                : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
            }`}
          >
            {claimableAmount > 0 ? `提取 ${claimableAmount.toLocaleString()} $PROJ` : '暂无可提取代币'}
          </button>
        </div>

        <div className="bg-[#0c0c0e] border border-zinc-800 p-6">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">链上合约技术锚点</h3>
          <div className="space-y-2 text-xs text-zinc-400 font-mono">
            <div className="flex justify-between border-b border-zinc-900 pb-1">
              <span className="text-zinc-600">网络环境:</span>
              <span className="text-emerald-400">Sei Testnet (EVM)</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-1">
              <span className="text-zinc-600">锁仓合约类型:</span>
              <span>OpenZeppelin VestingWallet</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-1">
              <span className="text-zinc-600">合约哈希 (预览):</span>
              <span className="text-zinc-500 truncate w-36">0x7F9...3b21</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">资源支持份额:</span>
              <span className="text-[#ff4596]">2.75% × 2 (共5.5%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}