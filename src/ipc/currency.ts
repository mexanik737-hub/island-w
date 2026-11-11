import { invoke } from "@tauri-apps/api/core";

export interface CurrencyRate {
  date: string;
  from: string;
  to: string;
  rate: number;
}
/** Frankfurter's daily reference rate; it is not a live trading quote. */
export const getCurrencyRate = (from: string, to: string) =>
  invoke<CurrencyRate>("currency_rate", { from, to });
