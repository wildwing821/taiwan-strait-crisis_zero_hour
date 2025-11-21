export enum RoleId {
  R01 = 'R01',
  R02 = 'R02',
  R03 = 'R03',
  R04 = 'R04',
  R05 = 'R05',
  R06 = 'R06',
  R07 = 'R07',
  R08 = 'R08',
  R09 = 'R09',
  R10 = 'R10',
}

export interface Role {
  id: RoleId;
  name: string;
  influence: string;
  focus: string;
  description: string;
  /**
   * Base64 encoded SVG string for the role icon.
   * 用於角色選擇畫面的圖示 (Base64 編碼的 SVG 字串)。
   */
  icon: string;
}

export interface TurnHistory {
  round: number;
  ipBefore: number;
  ipAfter: number;
  narrative: string;
  choiceSelected: string;
  choiceText: string;
}

export interface ScenarioResponse {
  narrative: string;
  choices: {
    id: string;
    text: string;
  }[];
  ipChange: number;
  gmComment: string;
}

export interface EndingResult {
  title: string;
  description: string;
  finalIp: number;
}