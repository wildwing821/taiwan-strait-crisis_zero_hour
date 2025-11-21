import { Role, RoleId } from './types';

// Utility to embed SVG icons as Base64 data URLs
// 方便地嵌入 SVG 圖示作為 Base64 資料 URL
// 由於要求替換為外部圖片，此 utility function 不再使用，但保留其註釋
// const svgToDataUrl = (svgContent: string): string => {
//   // Simple Base64 encoding for SVG, robust enough for modern browsers
//   const base64 = btoa(unescape(encodeURIComponent(svgContent)));
//   return `data:image/svg+xml;base64,${base64}`;
// };

// 替換為外部圖片路徑
const IconR01 = '/images/president.png'; // R01: 中華民國總統
const IconR02 = '/images/strategist.png'; // R02: 國防部作戰參謀官
const IconR03 = '/images/legislator.png'; // R03: 執政黨立法委員
const IconR04 = '/images/ceo.png'; // R04: 台灣高科技企業 CEO
const IconR05 = '/images/scholar.png'; // R05: 國際關係學者
const IconR06 = '/images/journalist.png'; // R06: 獨立媒體記者
const IconR07 = '/images/activist.png'; // R07: 地方社群行動家
const IconR08 = '/images/consultant.png'; // R08: 跨國金融顧問
const IconR09 = '/images/diplomat.png'; // R09: 美國國務院亞太助卿
const IconR10 = '/images/student.png'; // R10: 普通大學生

export const ROLES: Role[] = [
  {
    id: RoleId.R01,
    name: '中華民國總統 (President)',
    influence: '政治/軍事/外交',
    focus: '國家戰略與國際聯盟',
    description: '您是國家元首。您的每一個字都可能引發戰爭或帶來和平。',
    icon: IconR01, // 外部圖片：/images/president.png
  },
  {
    id: RoleId.R02,
    name: '國防部作戰參謀官 (Military Strategist)',
    influence: '軍事部署/情報戰',
    focus: '戰備強化與危機反應',
    description: '您負責實際的防禦佈局。敵人動向的解讀與回應是您的職責。',
    icon: IconR02, // 外部圖片：/images/strategist.png
  },
  {
    id: RoleId.R03,
    name: '執政黨立法委員 (Legislator)',
    influence: '內部法案/預算分配',
    focus: '國會協商與民意動員',
    description: '您在國會推動關鍵法案，需平衡民意與國家安全需求。',
    icon: IconR03, // 外部圖片：/images/legislator.png
  },
  {
    id: RoleId.R04,
    name: '台灣高科技企業 CEO (Tech CEO)',
    influence: '經濟/產業供應鏈',
    focus: '關鍵技術保護與全球合作',
    description: '您掌握著「矽盾」。您的商業決策牽動全球大國的神經。',
    icon: IconR04, // 外部圖片：/images/ceo.png
  },
  {
    id: RoleId.R05,
    name: '國際關係學者 (IR Scholar)',
    influence: '輿論/外交政策建議',
    focus: '政策分析與國際倡議',
    description: '您向政府提供策略，並在國際媒體上為台灣發聲。',
    icon: IconR05, // 外部圖片：/images/scholar.png
  },
  {
    id: RoleId.R06,
    name: '獨立媒體記者 (Journalist)',
    influence: '新聞自由/公眾認知',
    focus: '假訊息揭露與真相傳播',
    description: '您站在資訊戰的最前線，揭露真相，對抗認知作戰。',
    icon: IconR06, // 外部圖片：/images/journalist.png
  },
  {
    id: RoleId.R07,
    name: '地方社群行動家 (Activist)',
    influence: '社會動員/韌性建立',
    focus: '地方組織與民防訓練',
    description: '您組織黑熊學院類型的民防訓練，提升社會底層的抗壓性。',
    icon: IconR07, // 外部圖片：/images/activist.png
  },
  {
    id: RoleId.R08,
    name: '跨國金融顧問 (Financial Consultant)',
    influence: '國際資本流動',
    focus: '資本避險與金融制裁預警',
    description: '您監控資金流向，預警金融戰，協助資產配置與經濟制裁分析。',
    icon: IconR08, // 外部圖片：/images/consultant.png
  },
  {
    id: RoleId.R09,
    name: '美國國務院亞太助卿 (US Diplomat)',
    influence: '美國政策/國際合作',
    focus: '協調華府與盟友立場',
    description: '您代表美國利益，試圖在維持台海現狀與避免大國衝突間走鋼索。',
    icon: IconR09, // 外部圖片：/images/diplomat.png
  },
  {
    id: RoleId.R10,
    name: '普通大學生 (Student)',
    influence: '社會氛圍/個人選擇',
    focus: '升學/服役/移民的抉擇',
    description: '您的選擇代表了年輕一代的聲音，反映了社會最真實的焦慮與希望。',
    icon: IconR10, // 外部圖片：/images/student.png
  }
];

export const INITIAL_IP = 60;
export const MAX_ROUNDS = 5;
export const TARGET_IP = 20;

export const ENDING_TYPES = {
  E01: { range: [0, 10], title: "和平穩定：全面化解" },
  E02: { range: [11, 20], title: "嚇阻有效：維持現狀" },
  E03: { range: [21, 30], title: "外交突破：區域穩定" },
  E04: { range: [31, 40], title: "內部深化：韌性增強" },
  E05: { range: [41, 50], title: "高風險平衡：動態現狀" },
  E06: { range: [51, 60], title: "國際孤立：自我調整" },
  E07: { range: [61, 70], title: "經濟崩潰：人才流失" },
  E08: { range: [71, 80], title: "有限衝突：灰色地帶失控" },
  E09: { range: [81, 90], title: "被迫談判：主權受損" },
  E10: { range: [91, 100], title: "戰爭爆發：全面入侵" },
};