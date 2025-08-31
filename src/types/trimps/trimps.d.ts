import type { AutoBattle } from "./autoBattle.js";
export interface AutoBattleData {
  enemyLevel: number;
  dust: number;
  shards: number;
  enemiesKilled: number;
  maxEnemyLevel: number;
  autoLevel: boolean;
  lastActions: Array<
    [string, string, number, number, number, number, number]
  >;
  presets: {
    names: string[];
    p1: Array<string | ["level", number]>;
    p2: Array<string | ["level", number]>;
    p3: Array<string | ["level", number]>;
  };
  activeContract: string;
  items: Record<
    string,
    {
      equipped: boolean;
      owned: boolean;
      level: number;
      hidden: boolean;
    }
  >;
  rings: {
    level: number;
    mods: unknown[];
  };
  sealed: boolean;
  canSeal: boolean;
  bonuses: Record<string, number>;
  oneTimers: Record<string, boolean>;
  settings: {
    loadHide: number;
    loadLevel: number;
  };
}

export interface TrimpsWindow {
  autoBattle: AutoBattle;
  load(save: string, _flag1: boolean, _flag2: boolean): void;
  game: {
    global: {
      autoBattleData: AutoBattleData
    }
  }
}
