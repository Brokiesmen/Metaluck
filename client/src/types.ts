export type Rarity = 'gray' | 'blue' | 'purple' | 'gold';

export interface GiftImage {
  image: string;
  animated?: string;
}

export interface Prize {
  id: number;
  name: string;
  rarity: Rarity;
  icon: string;
  stars?: number;  // set for star prizes
  isPremium?: boolean;
}

export interface Leader {
  userId: number;
  name: string;
  balance: number;
  photoUrl?: string;
}

export interface Case {
  id: number;
  name: string;
  price: number;
  icon: string;
  color: string;
}

export interface RarityConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface HistoryEntry {
  caseId: number;
  caseName: string;
  prize: Prize;
  timestamp: number;
}

export interface TopupPackage {
  id: string;
  xtrAmount: number;
  balanceAmount: number;
  label: string;
  popular: boolean;
}

export interface LeaderPage {
  leaders: Leader[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
}

export interface HistoryPage {
  history: HistoryEntry[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
}
