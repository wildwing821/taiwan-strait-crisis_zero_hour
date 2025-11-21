import React, { useState, useEffect, useRef } from 'react';
// 引入 Tone.js
import * as Tone from 'tone'; 
import { Role, GameState, TurnHistory, Choice } from './types';
import { ROLES, INITIAL_IP, MAX_ROUNDS, TARGET_IP } from './constants';
import { generateRound, generateEnding } from './services/geminiService';
import RoleCard from './components/RoleCard';
import ProgressBar from './components/ProgressBar';

// =========================================================================
// 音效 Hook (SFX) - 保持不變
// =========================================================================

/**
 * 客製化 Hook 處理遊戲事件音效 (SFX)
 * @param isToneStarted - Tone.js AudioContext 是否已啟動
 */
const useSoundEffects = (isToneStarted: boolean) => {
    const initializedRef = useRef(false);
    const synthRef = useRef<Tone.Synth | null>(null);
    const metalRef = useRef<Tone.MetalSynth | null>(null);

    const initializeSFX = () => {
        if (!isToneStarted || initializedRef.current) return;

        // 1. Synth for general UI feedback
        const uiSynth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.0, release: 0.1 },
            volume: -10 
        }).toDestination();
        synthRef.current = uiSynth;

        // 2. MetalSynth for dramatic effects
        const drammaMetal = new Tone.MetalSynth({
            frequency: 100,
            envelope: { attack: 0.001, decay: 0.5, release: 0.5 },
            harmonicity: 5.1,
            modulationIndex: 32,
            octaves: 1.5,
            volume: -12
        }).toDestination();
        metalRef.current = drammaMetal;

        initializedRef.current = true;
        console.log('音效資源初始化完成');
    };

    const playChoiceSound = () => {
        if (synthRef.current) {
            try {
                synthRef.current.triggerAttackRelease("A5", "8n");
            } catch (e) {
                console.warn("Audio play failed", e);
            }
        }
    };

    const playNextRoundSound = () => {
        if (synthRef.current) {
            try {
                synthRef.current.triggerAttackRelease(["C5", "E5"], "16n", Tone.now(), 0.5); 
            } catch (e) {
                console.warn("Audio play failed", e);
            }
        }
    };

    const playEndingSound = (isSuccess: boolean) => {
        if (metalRef.current) {
            try {
                if (isSuccess) {
                    metalRef.current.triggerAttackRelease("G4", "1n");
                } else {
                    metalRef.current.triggerAttackRelease("C3", "1n");
                }
            } catch (e) {
                console.warn("Audio play failed", e);
            }
        }
    };

    useEffect(() => {
        if (isToneStarted && !initializedRef.current) {
            initializeSFX();
        }
        
        return () => {
            if (synthRef.current) {
                synthRef.current.dispose();
                synthRef.current = null;
            }
            if (metalRef.current) {
                metalRef.current.dispose();
                metalRef.current = null;
            }
            initializedRef.current = false;
        };
    }, [isToneStarted]);

    return { playChoiceSound, playNextRoundSound, playEndingSound };
};


// =========================================================================
// 背景音樂 Hook (修正版)
// =========================================================================

/**
 * 客製化 Hook 處理背景音樂的初始化和控制
 * 修正了全域音量衝突和競態條件問題。
 */
const useBackgroundMusic = () => {
    const synthRef = useRef<Tone.PolySynth | null>(null);
    const loopRef = useRef<Tone.Loop | null>(null);
    const bgmVolumeRef = useRef<Tone.Volume | null>(null); // 新增：獨立音量控制
    const stopTimerRef = useRef<NodeJS.Timeout | null>(null); // 新增：停止計時器 ref
    const initializedRef = useRef(false); 

    const initializeMusic = () => {
        if (initializedRef.current) return;

        // 創建獨立的 Volume 節點，初始設為靜音 (用於淡入)
        const bgmVolume = new Tone.Volume(-Infinity).toDestination();
        bgmVolumeRef.current = bgmVolume;

        // 1. 創建一個多音合成器，連接到 bgmVolume 而不是 Destination
        const synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sawtooth' }, 
            envelope: { attack: 2, decay: 0.5, sustain: 0.5, release: 2 }, 
            // volume: -15 // 不在這裡設定音量，由 bgmVolume 控制
        }).connect(bgmVolume);
        synthRef.current = synth;

        // 2. 創建一個低沉且具有緊張感的音樂循環
        const chords = [
            ["C3", "Eb3", "G3"], 
            ["Bb2", "Db3", "F3"], 
            ["F3", "Ab3", "C4"], 
            ["G2", "Bb2", "D3"] 
        ];
        let index = 0;

        const loop = new Tone.Loop(time => {
            if (synthRef.current) {
                synthRef.current.triggerAttackRelease(chords[index % chords.length], "2n", time);
                index++;
            }
        }, "2n"); 

        loopRef.current = loop;
        initializedRef.current = true;
        
        Tone.Transport.bpm.value = 80; 
        console.log('音樂資源初始化完成');
    };

    const startMusic = (time: number) => {
        if (!initializedRef.current) return;

        // 修正競態條件：如果有一個待執行的停止指令，取消它
        if (stopTimerRef.current) {
            clearTimeout(stopTimerRef.current);
            stopTimerRef.current = null;
        }
        
        if (Tone.Transport.state !== 'started') {
            Tone.Transport.start();
        }

        if (loopRef.current && loopRef.current.state !== 'started') {
            loopRef.current.start(time);
        }

        // 使用獨立的 Volume 節點淡入，不影響 SFX
        if (bgmVolumeRef.current) {
            bgmVolumeRef.current.volume.rampTo(-15, 2); 
        }
    };

    const stopMusic = (time: number) => {
        if (!initializedRef.current) return;

        // 淡出獨立 Volume 節點
        if (bgmVolumeRef.current) {
            bgmVolumeRef.current.volume.rampTo(-Infinity, 2); 
        }
        
        // 設定延遲停止，並保存 timer ID 以便取消
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);

        stopTimerRef.current = setTimeout(() => {
            // @ts-ignore
            if (loopRef.current) loopRef.current.stop();
            // 選擇性：如果沒有其他音效，也可以停止 Transport
            // Tone.Transport.stop(); 
        }, 2000);
    };

    // 資源清理
    const disposeMusic = () => {
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        loopRef.current?.dispose();
        synthRef.current?.dispose();
        bgmVolumeRef.current?.dispose();
        initializedRef.current = false;
    };

    return { initializeMusic, startMusic, stopMusic, disposeMusic, initializedRef };
};


// =========================================================================
// App 組件
// =========================================================================

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

    const [isToneStarted, setIsToneStarted] = useState(false);
    // 取得 disposeMusic 用於卸載清理
    const { initializeMusic, startMusic, stopMusic, disposeMusic, initializedRef } = useBackgroundMusic();
    const { playChoiceSound, playNextRoundSound, playEndingSound } = useSoundEffects(isToneStarted);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [gameState.currentNarrative]);
    
    // 監聽遊戲狀態，控制背景音樂的播放
    // 修正：LOADING 和 ENDING_GENERATING 狀態下音樂繼續播放
    useEffect(() => {
        if (initializedRef.current && isToneStarted) {
            const shouldPlay = 
                gameState.status === 'PLAYING' || 
                gameState.status === 'LOADING' || 
                gameState.status === 'ENDING_GENERATING';

            if (shouldPlay) {
                startMusic(Tone.now());
            } else {
                stopMusic(Tone.now());
            }
        }
    }, [gameState.status, initializedRef.current, isToneStarted]);

    // 組件卸載時清理音樂資源
    useEffect(() => {
        return () => {
            disposeMusic();
        };
    }, []);

    const startGame = async (role: Role) => {
        setGameState(prev => ({ ...prev, status: 'LOADING', role }));
        setLoadingMessage('正在建立加密連線... 初始化戰情室...');
        setErrorMessage(null);
        
        if (!isToneStarted) {
            try {
                await Tone.start();
                console.log("Tone.js AudioContext 啟動成功");
                setIsToneStarted(true);
            } catch (error) {
                console.error("Tone.js AudioContext 啟動失敗:", error);
                setErrorMessage("音訊啟動失敗。請確保瀏覽器支援 Web Audio API。");
                setGameState(prev => ({ ...prev, status: 'MENU' }));
                return; 
            }
        }

        initializeMusic(); 

        try {
            // Generate Round 1
            const scenario = await generateRound(role, 1, INITIAL_IP, []);
            
            setGameState(prev => ({
                ...prev,
                status: 'PLAYING',
                currentNarrative: scenario.narrative,
                currentChoices: scenario.choices,
                // 在startGame時不改變 ipChange，留給 generateRound 處理
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

        try { playChoiceSound(); } catch(e) {}

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
        const isFinalStep = gameState.round >= MAX_ROUNDS;

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
                
                try { 
                    const isSuccess = newIp <= TARGET_IP;
                    playEndingSound(isSuccess);
                } catch(e) {}

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
                try { playNextRoundSound(); } catch(e) {}
            }

        } catch (e: any) {
            console.error("Simulation Error:", e);
            // 修正錯誤處理：顯示錯誤訊息並回到 PLAYING 狀態允許重試
            setErrorMessage(`模擬運算中斷: ${e.message || '未知錯誤'}`);
            if (isFinalStep) {
                 // 如果是最後一步失敗，可能需要特殊處理，這裡簡單回退到 PLAYING
                 setGameState(prev => ({ ...prev, status: 'PLAYING' }));
            } else {
                 setGameState(prev => ({ ...prev, status: 'PLAYING' }));
            }
        }
    };

    const restartGame = () => {
        // 透過 hook 的 stopMusic 來安全停止，不需要傳入時間
        if (initializedRef.current) {
            stopMusic(Tone.now()); 
        }
        
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