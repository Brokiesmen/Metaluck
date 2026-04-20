export type Rarity = 'gray' | 'blue' | 'purple' | 'gold';

export interface Prize {
  id: number;
  name: string;
  rarity: Rarity;
  icon: string;
  stars?: number;  // set for star prizes
  isPremium?: boolean; // set for Telegram Premium
}

export interface WeightedPrize extends Prize {
  weight: number;
}

export interface Case {
  id: number;
  name: string;
  price: number;         // effective price (0 for free case when available)
  icon: string;
  color: string;
  isFree?: boolean;              // case 1: free once per 24h
  paidFallbackPrice?: number;    // cost when free timer is active
}
