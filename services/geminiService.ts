import { GoogleGenAI, Type } from "@google/genai";
import { Role, TurnHistory, ScenarioResponse, EndingResult } from "../types";
import { ENDING_TYPES, MAX_ROUNDS } from "../constants";

// --- 修正區域：使用 Vite 兼容的方式讀取 API 金鑰 ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY || API_KEY === 'PLACEHOLDER_API_KEY') {
  console.error(
    "Gemini API 金鑰缺失或仍為預留值 (PLACEHOLDER_API_KEY)。" +
    "請確保您已在 .env.local 檔案中設置有效的 VITE_GEMINI_API_KEY。"
  );
  // 在沒有有效金鑰時，讓 ai 變數保持未初始化或使用一個空物件，避免應用程式崩潰
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
// --- 修正區域結束 ---


const SYSTEM_INSTRUCTION = `
你現在擔任「台海危機互動式敘事遊戲」的遊戲大師（GM）。
核心任務：根據玩家選擇的角色，生成一個基於文字的互動式視覺小說體驗。
目標：玩家試圖將「中國入侵機率」（IP）從初始的 60% 降至 20% 以下。

規則：
1. 遊戲共 5 回合。
2. 每回合提供一個危機情境 (Scenario) 和 2-3 個決策選項 (Choices)。
3. 選項必須反映角色的權力與影響範圍（激進、鴿派、務實、投降等）。
4. 每次玩家選擇後，你必須評估該選擇對 IP 的影響（-15% 到 +15%）。
5. 敘事風格：嚴肅、地緣政治驚悚、寫實。使用繁體中文。
6. 必須透過 JSON 格式回應，嚴格遵守 Schema。
`;

// Schema for a regular game turn
const SCENARIO_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The current situation description (Scenario). Include the current 'Stage' or 'Round' context in the text. Approx 100-150 words.",
    },
    choices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Option ID, e.g., 'A', 'B', 'C'" },
          text: { type: Type.STRING, description: "The action description." },
        },
        required: ["id", "text"],
      },
      description: "2 to 3 actionable choices for the player.",
    },
    ipChange: {
      type: Type.INTEGER,
      description: "The numeric change to Invasion Probability based on the *previous* turn's choice. If Round 1, this is 0. Range -15 to 15.",
    },
    gmComment: {
      type: Type.STRING,
      description: "Short feedback on the previous choice (why IP changed) and a hint for the new situation.",
    },
  },
  required: ["narrative", "choices", "ipChange", "gmComment"],
};

// Schema for the ending
const ENDING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The ending title (e.g., E01: Peace)" },
    description: { type: Type.STRING, description: "A detailed 300-word narrative about the final outcome, the character's fate, and Taiwan's future." },
  },
  required: ["title", "description"],
};

export const generateRound = async (
  role: Role,
  round: number,
  currentIp: number,
  history: TurnHistory[]
): Promise<ScenarioResponse> => {
  const model = "gemini-2.5-flash";

  if (!API_KEY) {
    throw new Error("API Client not initialized due to missing API Key.");
  }
  
  let prompt = "";
  if (round === 1) {
    prompt = `
      【遊戲開始】
      玩家角色：${role.name} (${role.id})
      影響範圍：${role.influence}
      行動傾向：${role.focus}
      角色描述：${role.description}
      
      當前狀態：第 1 回合 / 共 ${MAX_ROUNDS} 回合
      當前入侵機率 (IP)：${currentIp}%
      
      請生成第 1 回合的危機情境。
      情境背景：北京當局宣布在台灣周邊進行實彈演習，國際局勢緊張。
      上一回合 IP 變化：0。
    `;
  } else {
    const lastTurn = history[history.length - 1];
    prompt = `
      【遊戲進行中】
      玩家角色：${role.name}
      當前狀態：第 ${round} / ${MAX_ROUNDS} 回合
      當前 IP (尚未結算上一回合成效)：${currentIp}%
      
      上一回合情境：${lastTurn.narrative}
      玩家上一回合選擇：${lastTurn.choiceSelected} - ${lastTurn.choiceText}
      
      任務：
      1. 根據玩家選擇 (${lastTurn.choiceSelected}) 判斷其對局勢的影響。
         - 有效嚇阻/降溫/獲得盟友：IP 下降 (負值)。
         - 激怒對方/示弱/內部混亂：IP 上升 (正值)。
         - 範圍：-15% 到 +15%。
      2. 生成新的 IP 變化數值 (ipChange)。
      3. 根據新的局勢，生成第 ${round} 回合的危機情境 (narrative)。
      4. 提供 2-3 個該角色可執行的下一步決策 (choices)。
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: SCENARIO_SCHEMA,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as ScenarioResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateEnding = async (
  role: Role,
  finalIp: number,
  history: TurnHistory[]
): Promise<EndingResult> => {
  const model = "gemini-2.5-flash";
  
  if (!API_KEY) {
    return {
       title: "API 客戶端未初始化",
       description: "由於缺少 API 金鑰，無法產生結局。",
       finalIp: finalIp
     };
  }

  // Determine ending type based on constants to guide AI
  let expectedEndingCode = "E10";
  let expectedEndingTitle = "戰爭爆發：全面入侵";
  
  Object.entries(ENDING_TYPES).forEach(([key, value]) => {
    if (finalIp >= value.range[0] && finalIp <= value.range[1]) {
      expectedEndingCode = key;
      expectedEndingTitle = value.title;
    }
  });

  const prompt = `
    【遊戲結束 - 結局生成】
    玩家角色：${role.name}
    最終入侵機率 (IP)：${finalIp}%
    判定結局區間：${expectedEndingCode} - ${expectedEndingTitle}
    
    歷史決策回顧：
    ${history.map((h, i) => `Round ${h.round}: ${h.choiceText} (IP: ${h.ipBefore}% -> ${h.ipAfter}%)`).join('\n')}
    
    請撰寫結局敘事 (約 300 字)：
    1. 標題必須是 ${expectedEndingTitle}。
    2. 描述該角色在結局中的個人命運。
    3. 描述台灣的最終國際處境與社會狀態。
    4. 風格：歷史的、深刻的。
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ENDING_SCHEMA,
        temperature: 0.8,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const json = JSON.parse(text);
    return {
      title: json.title,
      description: json.description,
      finalIp: finalIp
    };
  } catch (error) {
      console.error("Gemini Ending Error:", error);
      return {
        title: "通訊中斷",
        description: "紀錄在混亂中遺失。歷史的走向無人知曉。",
        finalIp: finalIp
      }
  }
};