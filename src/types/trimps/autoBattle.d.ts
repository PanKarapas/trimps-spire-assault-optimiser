export interface AutoBattle {
  // 300ms
  frameTime: number
  speed: number
  enemyLevel: number
  maxEnemyLevel: number
  autoLevel: boolean
  dust: number
  shards: number
  shardDust: number
  trimp: Trimp
  enemy: Enemy
  seed: number
  enemiesKilled: number
  sessionEnemiesKilled: number
  sessionTrimpsKilled: number
  maxItems: number
  notes: string
  popupMode: string
  battleTime: number
  lastSelect: string
  lastActions: [string, string, number, number, number, number, number][]
  activeContract: string
  sealed: boolean
  canSeal: boolean
  lootAvg: LootAvg
  presets: Presets
  rings: Rings
  settings: Settings
  items: {[key: string]: Item}
  bonuses: Bonuses
  oneTimers: OneTimers
  confirmUndo: boolean
  ringStats: RingStats
  hideMode: boolean
  profile: string
  fight(): void;
  getMaxItems(): number;
  resetCombat(resetStats?: boolean): number;
  getDustPs(): number;
  nextLevelCount(): number;
  getItemOrder(): { name: string; zone: any; }[];
}

export interface Trimp {
  level: number
  isTrimp: boolean
  baseHealth: number
  health: number
  maxHealth: number
  baseAttack: number
  attack: number
  baseAttackSpeed: number
  attackSpeed: number
  lastAttack: number
  shockChance: number
  shockMod: number
  bleedChance: number
  bleedMod: number
  bleedTime: number
  hadBleed: boolean
  poisonChance: number
  poisonTime: number
  poisonMod: number
  poisonStack: number
  poisonRate: number
  poisonTick: number
  poisonHeal: number
  defense: number
  lifesteal: number
  shockResist: number
  poisonResist: number
  bleedResist: number
  lifestealResist: number
  slowAura: number
  damageTakenMult: number
  enrageMult: number
  enrageFreq: number
  explodeDamage: number
  explodeFreq: number
  lastExplode: number
  berserkMod: number
  berserkStack: number
  ethChance: number
  dmgTaken: number
  dustMult: number
  gooStored: number
  lastGoo: number
  immune: string
  bleed: Bleed
  poison: Poison
  shock: Shock
  shockTime: number
}

export interface Bleed {
  time: number
  mod: number
}

export interface Poison {
  time: number
  mod: number
  lastTick: number
  stacks: number
  expired: boolean
  hitsAtMax: number
}

export interface Shock {
  time: number
  mod: number
  count: number
  timeApplied: number
}

export interface Enemy {
  level: number
  isTrimp: boolean
  baseHealth: number
  health: number
  maxHealth: number
  baseAttack: number
  attack: number
  baseAttackSpeed: number
  attackSpeed: number
  lastAttack: number
  shockChance: number
  shockMod: number
  bleedChance: number
  bleedMod: number
  bleedTime: number
  hadBleed: boolean
  poisonChance: number
  poisonTime: number
  poisonMod: number
  poisonStack: number
  poisonRate: number
  poisonTick: number
  poisonHeal: number
  defense: number
  lifesteal: number
  shockResist: number
  poisonResist: number
  bleedResist: number
  lifestealResist: number
  slowAura: number
  damageTakenMult: number
  enrageMult: number
  enrageFreq: number
  explodeDamage: number
  explodeFreq: number
  lastExplode: number
  berserkMod: number
  berserkStack: number
  ethChance: number
  dmgTaken: number
  dustMult: number
  gooStored: number
  lastGoo: number
  immune: string
  bleed: Bleed
  poison: Poison
  shock: Shock
  shockTime: number
}


export interface LootAvg {
  accumulator: number
  counter: number
}

export interface Presets {
  names: string[]
  p1: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    [string, number]
  ]
  p2: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    [string, number]
  ]
  p3: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    [string, number]
  ]
}

export interface Rings {
  level: number
  mods: any[]
}

export interface Settings {
  loadHide: LoadHide
  loadLevel: LoadLevel
  loadRing: LoadRing
  practice: Practice
}

export interface LoadHide {
  enabled: number
  default: number
  text: string[]
}

export interface LoadLevel {
  enabled: number
  default: number
  text: string[]
}

export interface LoadRing {
  enabled: number
  default: number
  text: string[]
}

export interface Practice {
  enabled: number
  default: number
  text: string[]
}

export interface Item {
  owned: boolean
  equipped: boolean
  hidden: boolean
  level: number
  upgrade: string
  startPrice?: number
  useShards?: boolean
  priceMod: number
  zone?: number
}

export interface Bonuses {
  Extra_Limbs: ExtraLimbs
  Radon: Radon
  Stats: Stats
  Scaffolding: Scaffolding
}

export interface ExtraLimbs {
  level: number
  price: number
  priceMod: number
}

export interface Radon {
  level: number
  price: number
  priceMod: number
  max: number
}

export interface Stats {
  level: number
  price: number
  priceMod: number
  max: number
}

export interface Scaffolding {
  level: number
  price: number
  useShards: boolean
  priceMod: number
  max: number
}

export interface OneTimers {
  Gathermate: Gathermate
  Smithriffic: Smithriffic
  Championism: Championism
  Master_of_Arms: MasterOfArms
  Artisan: Artisan
  Battlescruff: Battlescruff
  Collectology: Collectology
  Dusty_Tome: DustyTome
  Whirlwind_of_Arms: WhirlwindOfArms
  Nullicious: Nullicious
  Suprism: Suprism
  The_Ring: TheRing
  Mass_Hysteria: MassHysteria
  Burstier: Burstier
  Expanding_Tauntimp: ExpandingTauntimp
  More_Expansion: MoreExpansion
}

export interface Gathermate {
  description: string
  owned: boolean
  requiredItems: number
}

export interface Smithriffic {
  description: string
  owned: boolean
  requiredItems: number
}

export interface Championism {
  description: string
  owned: boolean
  requiredItems: number
}

export interface MasterOfArms {
  description: string
  owned: boolean
  requiredItems: number
}

export interface Artisan {
  description: string
  owned: boolean
  requiredItems: number
}

export interface Battlescruff {
  description: string
  owned: boolean
  requiredItems: number
}

export interface Collectology {
  description: string
  owned: boolean
  requiredItems: number
}

export interface DustyTome {
  description: string
  owned: boolean
  requiredItems: number
}

export interface WhirlwindOfArms {
  description: string
  owned: boolean
  requiredItems: number
}

export interface Nullicious {
  description: string
  owned: boolean
  requiredItems: number
}

export interface Suprism {
  description: string
  owned: boolean
  requiredItems: number
}

export interface TheRing {
  description: string
  owned: boolean
  requiredItems: number
  useShards: boolean
}

export interface MassHysteria {
  description: string
  owned: boolean
  requiredItems: number
  useShards: boolean
}

export interface Burstier {
  description: string
  owned: boolean
  requiredItems: number
  useShards: boolean
}

export interface ExpandingTauntimp {
  description: string
  owned: boolean
  requiredItems: number
  useShards: boolean
}

export interface MoreExpansion {
  description: string
  owned: boolean
  requiredItems: number
  useShards: boolean
}

export interface RingStats {
  attack: Attack
  health: Health
  defense: Defense
  lifesteal: Lifesteal
  dustMult: DustMult
}

export interface Attack {
  name: string
  baseGain: number
  perTen: number
}

export interface Health {
  name: string
  baseGain: number
  perTen: number
}

export interface Defense {
  name: string
  baseGain: number
  perTen: number
}

export interface Lifesteal {
  name: string
  baseGain: number
  perTen: number
}

export interface DustMult {
  name: string
  baseGain: number
  perTen: number
}
