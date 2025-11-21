import React from 'react';
import { Role } from '../types';

interface RoleCardProps {
  role: Role;
  onSelect: (role: Role) => void;
}

const RoleCard: React.FC<RoleCardProps> = ({ role, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(role)}
      // 調整卡片樣式：讓內容居中對齊，並保持整體彈性佈局
      className="flex flex-col items-center text-center bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-cyan-400 transition-all duration-300 p-6 rounded-xl group h-full"
    >
      {/* 1. 角色圖示 - 容器 */}
      {/* 容器使用 w-20 h-20 確保有一個清晰的邊界，背景顏色可以幫助區分 */}
      <div className="mb-4 w-20 h-20 p-1 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:bg-cyan-900 transition-colors">
        <img
          src={role.icon}
          alt={`${role.name} Icon`}
          // 確保圖片本身也是 w-full h-full 佔滿容器，且圓形和裁剪正確
          className="w-full h-full object-cover rounded-full" 
        />
      </div>

      {/* 2. 角色 ID - 保持在頂部 */}
      <div className="w-full mb-3">
        <span className="text-xs font-mono text-cyan-500 bg-cyan-900/20 px-2 py-1 rounded">{role.id}</span>
      </div>

      {/* 3. 角色名稱 */}
      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300">{role.name}</h3>
      
      {/* 4. 影響範圍 */}
      <p className="text-sm text-slate-400 mb-3 font-mono border-b border-slate-700 pb-2 w-full">{role.influence}</p>
      
      {/* 5. 角色描述 */}
      <p className="text-sm text-slate-300 leading-relaxed flex-grow">{role.description}</p>
      
      {/* 6. 點擊提示 (選單底部) */}
      <span className="mt-4 text-xs text-cyan-500/70 group-hover:text-cyan-400 transition-colors">點擊選擇此角色</span>
    </button>
  );
};

export default RoleCard;