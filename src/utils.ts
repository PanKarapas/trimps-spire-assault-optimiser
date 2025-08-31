import type { AutoBattle } from "./types/trimps/autoBattle.js";
import type { TrimpsWindow } from "./types/trimps/trimps.js";
import path from "path";
export interface TrimpsStats {
    maxEnemyLevel: number,
    enemiesOnMaxLevel: number
}
export function getTrimpsStats(save: string): TrimpsStats {
  const trimps: TrimpsWindow = window as any;
  trimps.load(save, false, false);
  const autoBattle: AutoBattle = trimps.autoBattle;
  autoBattle.enemyLevel = autoBattle.maxEnemyLevel;
  return {
    maxEnemyLevel: autoBattle.maxEnemyLevel,
    enemiesOnMaxLevel: autoBattle.nextLevelCount()
  };
}

export function resolvePath(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

