import type { Effects } from './data/types';

export interface GameState {
  chapter: number; node: string;
  hp: number; maxHp: number;
  faith: number; courage: number; wisdom: number;
}
const KEY = 'noah-rpg-save-v1';

export const newState = (): GameState => ({
  chapter: 1, node: 'start', hp: 30, maxHp: 30, faith: 1, courage: 1, wisdom: 1,
});

export let state: GameState = newState();
export const resetState = () => { state = newState(); };

export function applyEffects(e?: Effects) {
  if (!e) return;
  for (const k of Object.keys(e) as (keyof Effects)[]) state[k] += e[k] ?? 0;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }
export function hasSave(): boolean { try { return !!localStorage.getItem(KEY); } catch { return false; } }
export function load(): boolean {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return false;
    state = { ...newState(), ...JSON.parse(s) };
    return true;
  } catch { return false; }
}
