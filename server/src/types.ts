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
  price: number;
  icon: string;
  color: string;
}
