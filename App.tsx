import React, { useState, useEffect, useRef } from 'react';
import { Role, GameState, TurnHistory, Choice } from './types';
import { ROLES, INITIAL_IP, MAX_ROUNDS, TARGET_IP } from './constants';
import { generateRound, generateEnding } from './services/geminiService';
import RoleCard from './components/RoleCard';
import ProgressBar from './components/ProgressBar';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'MENU',
    role: null,
    round: 1,
    invasionProb: INITIAL_IP,
    history: [],
    currentNarrative: '',
    currentChoices: [],
    ending: null,
  });
  
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [gameState.currentNarrative]);

  const startGame = async (role: Role) => {
    setGameState(prev => ({ ...prev, status: 'LOADING', role }));
    setLoadingMessage('正在建立加密連線... 初始化戰情室...');
    setErrorMessage(null);
    
    try {
      // Generate Round 1
      const scenario = await generateRound(role, 1, INITIAL_IP, []);
      
      setGameState(prev => ({
        ...prev,
        status: 'PLAYING',
        currentNarrative: scenario.narrative,
        currentChoices: scenario.choices,
        invasionProb: Math.min(Math.max(prev.invasionProb + scenario.ipChange, 0), 100)
      }));
    } catch (e) {
      console.error(e);
      setErrorMessage("無法連接到 AI 核心。請檢查 API Key 或網路連線。");
      setGameState(prev => ({ ...prev, status: 'MENU' }));
    }
  };

  const handleChoice = async (choice: Choice) => {
    if (!gameState.role) return;

    // Record History
    const newHistoryItem: TurnHistory = {
      round: gameState.round,
      narrative: gameState.currentNarrative,
      choiceSelected: choice.id,
      choiceText: choice.text,
      ipBefore: gameState.invasionProb,
      // Placeholder, updated after next round calculation
      ipAfter: gameState.invasionProb, 
    };

    const updatedHistory = [...gameState.history, newHistoryItem];

    setGameState(prev => ({ ...prev, status: 'LOADING' }));
    setLoadingMessage('分析決策後果... 攔截敵方通訊...');
    setErrorMessage(null);

    try {
      // Process Turn
      const response = await generateRound(
        gameState.role, 
        gameState.round + 1, 
        gameState.invasionProb, 
        updatedHistory
      );

      const newIp = Math.min(Math.max(gameState.invasionProb + response.ipChange, 0), 100);
      
      // Update history with actual result
      updatedHistory[updatedHistory.length - 1].ipAfter = newIp;

      if (gameState.round >= MAX_ROUNDS) {
        // Generate Ending
        setGameState(prev => ({ 
            ...prev, 
            status: 'ENDING_GENERATING',
            invasionProb: newIp,
            history: updatedHistory
        }));
        setLoadingMessage('正在計算最終地緣政治後果...');
        
        const ending = await generateEnding(gameState.role, newIp, updatedHistory);
        setGameState(prev => ({
            ...prev,
            status: 'ENDING',
            ending: ending
        }));
      } else {
        // Next Round
        setGameState(prev => ({
            ...prev,
            status: 'PLAYING',
            round: prev.round + 1,
            invasionProb: newIp,
            history: updatedHistory,
            currentNarrative: response.narrative,
            currentChoices: response.choices
        }));
      }

    } catch (e) {
       console.error(e);
       setErrorMessage("模擬運算中斷。請重試。");
       setGameState(prev => ({ ...prev, status: 'PLAYING' })); // Return to state to allow retry?
    }
  };

  const restartGame = () => {
    setGameState({
      status: 'MENU',
      role: null,
      round: 1,
      invasionProb: INITIAL_IP,
      history: [],
      currentNarrative: '',
      currentChoices: [],
      ending: null,
    });
    setErrorMessage(null);
  };

  // --- RENDERERS ---

  if (gameState.status === 'MENU') {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex flex-col items-center">
        <header className="max-w-4xl w-full mb-12 text-center pt-10">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-4 tracking-tighter">
                TAIWAN STRAIT : ZERO HOUR
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                台海危機互動式模擬系統。選擇你的身份，在 5 個回合內做出關鍵決策。
                目標：將入侵機率 (IP) 降至 <span className="text-green-400 font-bold">{TARGET_IP}%</span> 以下。
            </p>
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-500 text-red-200 rounded">
                {errorMessage}
              </div>
            )}
            <div className="mt-6 inline-block px-4 py-2 bg-red-900/30 border border-red-500/50 rounded text-red-200 font-mono text-sm">
                CURRENT THREAT LEVEL: CRITICAL ({INITIAL_IP}%)
            </div>
        </header>

        <main className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
            {ROLES.map(role => (
                <RoleCard key={role.id} role={role} onSelect={startGame} />
            ))}
        </main>
      </div>
    );
  }

  if (gameState.status === 'LOADING' || gameState.status === 'ENDING_GENERATING') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 className="text-xl font-mono text-blue-400 animate-pulse">{loadingMessage}</h2>
        <p className="text-slate-500 mt-4 font-mono text-sm">正在存取量子雲端運算...</p>
      </div>
    );
  }

  if (gameState.status === 'ENDING' && gameState.ending) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl animate-fade-in">
                <div className={`h-2 w-full ${
                    gameState.invasionProb <= TARGET_IP ? 'bg-green-500' : 
                    gameState.invasionProb >= 80 ? 'bg-red-600' : 'bg-yellow-500'
                }`}></div>
                
                <div className="p-8 md:p-12">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-slate-400 font-mono text-sm mb-1">SIMULATION COMPLETE</h3>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{gameState.ending.title}</h1>
                        </div>
                        <div className="text-right">
                            <div className="text-slate-400 text-xs font-mono uppercase">Final IP</div>
                            <div className={`text-3xl font-bold font-mono ${
                                gameState.invasionProb <= TARGET_IP ? 'text-green-400' : 'text-red-400'
                            }`}>{gameState.invasionProb}%</div>
                        </div>
                    </div>
                    
                    <div className="prose prose-invert prose-lg max-w-none mb-12 leading-relaxed text-slate-300 whitespace-pre-wrap">
                        {gameState.ending.description}
                    </div>
                    
                    <button 
                        onClick={restartGame}
                        className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all shadow-lg transform hover:-translate-y-1"
                    >
                        重啟模擬 (RESTART SIMULATION)
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // 遊戲主介面 (PLAYING 狀態)
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
            
            {/* 頂部 HUD (簡化版) */}
            <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 shadow-md">
                <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
                    {/* 標題和回合數 */}
                    <div className="text-white font-bold text-sm md:text-base">
                        TAIWAN STRAIT : ZERO HOUR
                        <div className="text-xs text-slate-500 font-mono">
                            ROUND {gameState.round}/{MAX_ROUNDS}
                        </div>
                    </div>
                    
                    {/* 進度條 */}
                    {/* 修正了結構，確保 ProgressBar 位於一個合理的容器中 */}
                    <div className="w-full md:w-1/2 max-w-lg">
                        <ProgressBar value={gameState.invasionProb} label="Invasion Probability" />
                    </div>
                </div>
            </header>

            {/* 核心兩欄佈局容器 */}
            <div className="flex flex-1">
            
                {/* 左側：角色圖標與資訊欄 (Side Bar) - 佔用大螢幕 1/2 */}
                <aside 
                    className="hidden lg:flex w-full md:w-1/5 lg:w-1/6 p-8 bg-slate-900 border-r border-slate-800 sticky top-0 min-h-screen"
                    style={{ top: '0' }}
                >
                    <div className="flex flex-col items-center justify-center w-full h-full text-center">
                        {/* 放大後的角色圖標 */}
                        <div className="w-40 h-40 bg-slate-800 rounded-full flex items-center justify-center text-cyan-400 font-bold border border-4 border-cyan-400 mb-6 shadow-xl">
                            <img
                                src={gameState.role?.icon} 
                                alt={`${gameState.role?.name} Icon`}
                                className="w-full h-full object-cover rounded-full" 
                            />
                        </div>

                        {/* 角色名稱和描述 */}
                        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
                            {gameState.role?.name}
                        </h2>
                        <p className="text-lg text-slate-400 max-w-sm mx-auto mb-10">
                            {gameState.role?.description || "您的決策將改變全球格局。"}
                        </p>
                        
                        <button
                            onClick={restartGame}
                            className="mt-10 px-6 py-2 border border-red-500 text-red-400 hover:bg-red-900/30 transition-colors rounded-lg text-sm font-mono"
                        >
                            中斷模擬 (RESTART)
                        </button>
                    </div>
                </aside>
                
                {/* 右側：主遊戲內容區 (Main Content) - 佔用大螢幕剩餘空間 */}
                <main className="flex-grow w-full md:w-4/5 lg:w-5/6 max-w-4xl lg:max-w-none mx-auto p-4 md:p-8 flex flex-col gap-8">

                    
                    {errorMessage && (
                        <div className="w-full p-3 bg-red-900/50 border border-red-500 text-red-200 rounded text-center">
                            {errorMessage}
                            <button onClick={() => setErrorMessage(null)} className="ml-4 underline">Dismiss</button>
                        </div>
                    )}

                    
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 md:p-8 min-h-[200px] shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                        <h3 className="text-cyan-500 font-mono text-sm mb-4 uppercase tracking-widest opacity-70">Incoming Situation Report...</h3>
                        <p className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap font-serif animate-fade-in">
                            {gameState.currentNarrative}
                        </p>
                        <div ref={messagesEndRef} />
                    </div>

                    
                    <div className="grid grid-cols-1 gap-4 mb-10">
                        {gameState.currentChoices.map((choice) => (
                            <button
                                key={choice.id}
                                onClick={() => handleChoice(choice)}
                                disabled={gameState.status === 'LOADING'}
                                className={`group relative bg-slate-800 border-l-4 p-5 text-left transition-all duration-200 shadow-lg rounded-r-lg ${
                                    gameState.status === 'LOADING' 
                                    ? 'opacity-50 cursor-not-allowed border-slate-600'
                                    : 'hover:bg-slate-700 border-slate-600 hover:border-cyan-400'
                                }`}
                            >
                                <span className="absolute top-4 right-4 text-xs font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">
                                    OPTION [{choice.id}]
                                </span>
                                <div className="font-bold text-lg text-slate-200 group-hover:text-white mb-1">
                                    {choice.text}
                                </div>
                                <div className="h-0 group-hover:h-auto text-xs text-cyan-400 overflow-hidden transition-all opacity-0 group-hover:opacity-100 mt-0 group-hover:mt-2">
                                    &gt; EXECUTE PROTOCOL
                                </div>
                            </button>
                        ))}
                    </div>

                </main>
            </div>
        </div>
    );
};

export default App;
