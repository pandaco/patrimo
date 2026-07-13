import { Envelope } from './models';

/** PV latente : plus-value sur les positions actives, exclut le cash non investi. */
export function unrealizedPlusValue(env: Envelope): number {
  return (env.value - env.cash) - env.invested;
}

/** Rentabilité latente (en pourcentage) : PV latente / montant investi sur les positions actives. */
export function unrealizedPnlPct(env: Envelope): number {
  return env.invested ? ((env.value - env.cash) / env.invested - 1) * 100 : 0;
}

/** Taux de remplissage du plafond par rapport aux versements (dépôts nets). */
export function capPct(env: Envelope): number | null {
  return env.plafond ? (env.contributed / env.plafond) * 100 : null;
}

export function unrealizedPlusValueMulti(envs: Envelope[]): number {
  return envs.reduce((sum, env) => sum + unrealizedPlusValue(env), 0);
}

export function unrealizedPnlPctMulti(envs: Envelope[]): number {
  const invested = envs.reduce((sum, env) => sum + env.invested, 0);
  return invested ? (unrealizedPlusValueMulti(envs) / invested) * 100 : 0;
}
