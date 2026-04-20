import type { WeightedPrize, Case } from './types.js';

export const FREE_CASE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

export const CASES: Case[] = [
  { id: 1, name: 'Стартовый кейс',   price: 0,    icon: '📦', color: '#4a9eda', isFree: true, paidFallbackPrice: 100 },
  { id: 2, name: 'Продвинутый кейс', price: 100,  icon: '🎁', color: '#9b59b6' },
  { id: 3, name: 'Элитный кейс',     price: 1000, icon: '💎', color: '#e8a319' },
];

// Star prizes — 90% of all drops
// Distribution within stars: 25★ ~52% | 50★ ~26% | 100★ ~14% | 500★ ~6% | 1000★ ~2%
export const STAR_PRIZES: WeightedPrize[] = [
  { id: 201, name: '25 звёзд',    rarity: 'gray',   weight: 4500, icon: '⭐', stars:   25 },
  { id: 202, name: '50 звёзд',    rarity: 'gray',   weight: 2200, icon: '⭐', stars:   50 },
  { id: 203, name: '100 звёзд',   rarity: 'blue',   weight: 1200, icon: '⭐', stars:  100 },
  { id: 204, name: '500 звёзд',   rarity: 'purple', weight:  500, icon: '⭐', stars:  500 },
  { id: 205, name: '1000 звёзд',  rarity: 'gold',   weight:  200, icon: '⭐', stars: 1000 },
];

export const PRIZES: WeightedPrize[] = [...STAR_PRIZES,
  { id: 206, name: 'Telegram Premium 1 месяц', rarity: 'gold', weight: 4, icon: '', isPremium: true },
  { id: 207, name: 'Telegram Premium 3 месяца', rarity: 'gold', weight: 2, icon: '', isPremium: true },
  { id: 208, name: 'Telegram Premium 1 год', rarity: 'gold', weight: 1, icon: '', isPremium: true },
  { id:   1, name: 'Artisan Bricks', rarity: 'gold', weight:  8, icon: '' },
  { id:   2, name: 'Astral Shards', rarity: 'gold', weight:  8, icon: '' },
  { id:   3, name: 'B-Day Candles', rarity: 'blue', weight:  8, icon: '' },
  { id:   4, name: 'Berry Boxes', rarity: 'purple', weight:  5, icon: '' },
  { id:   5, name: 'Big Years', rarity: 'blue', weight:  8, icon: '' },
  { id:   6, name: 'Bling Binkies', rarity: 'gold', weight:  8, icon: '' },
  { id:   7, name: 'Bonded Rings', rarity: 'gold', weight:  8, icon: '' },
  { id:   8, name: 'Bow Ties', rarity: 'purple', weight:  5, icon: '' },
  { id:   9, name: 'Bunny Muffins', rarity: 'purple', weight:  5, icon: '' },
  { id:  10, name: 'Candy Canes', rarity: 'blue', weight:  8, icon: '' },
  { id:  11, name: 'Chill Flames', rarity: 'purple', weight:  5, icon: '' },
  { id:  12, name: 'Clover Pins', rarity: 'blue', weight:  8, icon: '' },
  { id:  13, name: 'Cookie Hearts', rarity: 'blue', weight:  8, icon: '' },
  { id:  14, name: 'Crystal Balls', rarity: 'purple', weight:  5, icon: '' },
  { id:  15, name: 'Cupid Charms', rarity: 'purple', weight:  5, icon: '' },
  { id:  16, name: 'Desk Calendars', rarity: 'gray', weight: 55, icon: '' },
  { id:  17, name: 'Diamond Rings', rarity: 'purple', weight:  5, icon: '' },
  { id:  18, name: "Durov's Cap", rarity: 'gold', weight:  8, icon: '' },
  { id:  19, name: 'Easter Eggs', rarity: 'blue', weight:  8, icon: '' },
  { id:  20, name: 'Electric Skulls', rarity: 'purple', weight:  5, icon: '' },
  { id:  21, name: 'Eternal Candles', rarity: 'blue', weight:  8, icon: '' },
  { id:  22, name: 'Eternal Roses', rarity: 'purple', weight:  5, icon: '' },
  { id:  23, name: 'Evil Eyes', rarity: 'blue', weight:  8, icon: '' },
  { id:  24, name: 'Faith Amulets', rarity: 'blue', weight:  8, icon: '' },
  { id:  25, name: 'Flying Brooms', rarity: 'purple', weight:  5, icon: '' },
  { id:  26, name: 'Fresh Socks', rarity: 'purple', weight:  5, icon: '' },
  { id:  27, name: 'Gem Signets', rarity: 'gold', weight:  8, icon: '' },
  { id:  28, name: 'Genie Lamps', rarity: 'gold', weight:  8, icon: '' },
  { id:  29, name: 'Ginger Cookies', rarity: 'blue', weight:  8, icon: '' },
  { id:  30, name: 'Hanging Stars', rarity: 'purple', weight:  5, icon: '' },
  { id:  31, name: 'Happy Brownies', rarity: 'purple', weight:  5, icon: '' },
  { id:  32, name: 'Heart Locket', rarity: 'gold', weight:  8, icon: '' },
  { id:  33, name: 'Heroic Helmet', rarity: 'gold', weight:  8, icon: '' },
  { id:  34, name: 'Hex Pots', rarity: 'blue', weight:  8, icon: '' },
  { id:  35, name: 'Holiday Drinks', rarity: 'purple', weight:  5, icon: '' },
  { id:  36, name: 'Homemade Cakes', rarity: 'gray', weight: 55, icon: '' },
  { id:  37, name: 'Hypno Lollipops', rarity: 'purple', weight:  5, icon: '' },
  { id:  38, name: 'Ice Creams', rarity: 'gray', weight: 55, icon: '' },
  { id:  39, name: 'Input Keys', rarity: 'blue', weight:  8, icon: '' },
  { id:  40, name: 'Instant Ramens', rarity: 'blue', weight:  8, icon: '' },
  { id:  41, name: 'Ion Gems', rarity: 'gold', weight:  8, icon: '' },
  { id:  42, name: 'Ionic Dryers', rarity: 'gold', weight:  8, icon: '' },
  { id:  43, name: 'Jacks-in-the-Box', rarity: 'blue', weight:  8, icon: '' },
  { id:  44, name: 'Jelly Bunnies', rarity: 'blue', weight:  8, icon: '' },
  { id:  45, name: 'Jester Hats', rarity: 'blue', weight:  8, icon: '' },
  { id:  46, name: 'Jingle Bells', rarity: 'purple', weight:  5, icon: '' },
  { id:  47, name: 'Jolly Chimps', rarity: 'blue', weight:  8, icon: '' },
  { id:  48, name: 'Joyful Bundles', rarity: 'gold', weight:  8, icon: '' },
  { id:  49, name: "Khabib's Papakha", rarity: 'gold', weight:  8, icon: '' },
  { id:  50, name: 'Kissed Frogs', rarity: 'purple', weight:  5, icon: '' },
  { id:  51, name: 'Light Swords', rarity: 'blue', weight:  8, icon: '' },
  { id:  52, name: 'Lol Pops', rarity: 'gray', weight: 55, icon: '' },
  { id:  53, name: 'Loot Bags', rarity: 'purple', weight:  5, icon: '' },
  { id:  54, name: 'Love Candles', rarity: 'gold', weight:  8, icon: '' },
  { id:  55, name: 'Love Potions', rarity: 'purple', weight:  5, icon: '' },
  { id:  56, name: 'Low Riders', rarity: 'purple', weight:  5, icon: '' },
  { id:  57, name: 'Lunar Snakes', rarity: 'blue', weight:  8, icon: '' },
  { id:  58, name: 'Lush Bouquets', rarity: 'purple', weight:  5, icon: '' },
  { id:  59, name: 'Mad Pumpkins', rarity: 'purple', weight:  5, icon: '' },
  { id:  60, name: 'Magic Potions', rarity: 'purple', weight:  5, icon: '' },
  { id:  61, name: 'Mighty Arms', rarity: 'gold', weight:  8, icon: '' },
  { id:  62, name: 'Mini Oscars', rarity: 'gold', weight:  8, icon: '' },
  { id:  63, name: 'Money Pots', rarity: 'purple', weight:  5, icon: '' },
  { id:  64, name: 'Mood Packs', rarity: 'purple', weight:  5, icon: '' },
  { id:  65, name: 'Moon Pendants', rarity: 'blue', weight:  8, icon: '' },
  { id:  66, name: 'Mousse Cakes', rarity: 'purple', weight:  5, icon: '' },
  { id:  67, name: 'Nail Bracelets', rarity: 'gold', weight:  8, icon: '' },
  { id:  68, name: 'Neko Helmets', rarity: 'purple', weight:  5, icon: '' },
  { id:  69, name: 'Party Sparklers', rarity: 'blue', weight:  8, icon: '' },
  { id:  70, name: 'Perfume Bottles', rarity: 'gold', weight:  8, icon: '' },
  { id:  71, name: 'Pet Snakes', rarity: 'purple', weight:  5, icon: '' },
  { id:  72, name: 'Plush Pepe', rarity: 'gold', weight:  8, icon: '' },
  { id:  73, name: 'Pool Floats', rarity: 'purple', weight:  5, icon: '' },
  { id:  74, name: 'Precious Peaches', rarity: 'gold', weight:  8, icon: '' },
  { id:  75, name: 'Pretty Posies', rarity: 'purple', weight:  5, icon: '' },
  { id:  76, name: 'Rare Birds', rarity: 'gold', weight:  8, icon: '' },
  { id:  77, name: 'Record Players', rarity: 'purple', weight:  5, icon: '' },
  { id:  78, name: 'Restless Jars', rarity: 'purple', weight:  5, icon: '' },
  { id:  79, name: 'Sakura Flowers', rarity: 'blue', weight:  8, icon: '' },
  { id:  80, name: 'Santa Hats', rarity: 'blue', weight:  8, icon: '' },
  { id:  81, name: 'Scared Cats', rarity: 'blue', weight:  8, icon: '' },
  { id:  82, name: 'Sharp Tongues', rarity: 'purple', weight:  5, icon: '' },
  { id:  83, name: 'Signet Rings', rarity: 'purple', weight:  5, icon: '' },
  { id:  84, name: 'Skull Flowers', rarity: 'purple', weight:  5, icon: '' },
  { id:  85, name: 'Sky Stilettos', rarity: 'purple', weight:  5, icon: '' },
  { id:  86, name: 'Sleigh Bells', rarity: 'purple', weight:  5, icon: '' },
  { id:  87, name: 'Snake Boxes', rarity: 'purple', weight:  5, icon: '' },
  { id:  88, name: 'Snoop Cigars', rarity: 'blue', weight:  8, icon: '' },
  { id:  89, name: 'Snoop Dogg', rarity: 'gray', weight: 55, icon: '' },
  { id:  90, name: 'Snow Globes', rarity: 'purple', weight:  5, icon: '' },
  { id:  91, name: 'Snow Mittens', rarity: 'purple', weight:  5, icon: '' },
  { id:  92, name: 'Spiced Wines', rarity: 'blue', weight:  8, icon: '' },
  { id:  93, name: 'Spring Baskets', rarity: 'blue', weight:  8, icon: '' },
  { id:  94, name: 'Spy Agarics', rarity: 'gray', weight: 55, icon: '' },
  { id:  95, name: 'Star Notepads', rarity: 'purple', weight:  5, icon: '' },
  { id:  96, name: 'Stellar Rockets', rarity: 'blue', weight:  8, icon: '' },
  { id:  97, name: 'Swag Bags', rarity: 'blue', weight:  8, icon: '' },
  { id:  98, name: 'Swiss Watches', rarity: 'blue', weight:  8, icon: '' },
  { id:  99, name: 'Tama Gadgets', rarity: 'blue', weight:  8, icon: '' },
  { id: 100, name: 'Timeless Books', rarity: 'gold', weight:  8, icon: '' },
];

// Case 1 (Стартовый) — standard distribution, same as PRIZES
export const PRIZES_CASE1 = PRIZES;

// Case 2 (Продвинутый) — boosted Rare/Epic, fewer stars/commons
export const PRIZES_CASE2: WeightedPrize[] = PRIZES.map(p => {
  if (p.stars) {
    // Stars still drop but much less often
    const reduced: Record<number, number> = { 201: 800, 202: 400, 203: 200, 204: 80, 205: 30 };
    return { ...p, weight: reduced[p.id] ?? p.weight };
  }
  if (p.rarity === 'gray')   return { ...p, weight: 5  };
  if (p.rarity === 'blue')   return { ...p, weight: 20 };
  if (p.rarity === 'purple') return { ...p, weight: 18 };
  if (p.rarity === 'gold')   return { ...p, weight: 12 };
  return p;
});

// Case 3 (Элитный) — only Epic (purple) and Legendary (gold), no stars, no common
export const PRIZES_CASE3: WeightedPrize[] = PRIZES.filter(
  p => !p.stars && (p.rarity === 'purple' || p.rarity === 'gold'),
).map(p => ({
  ...p,
  weight: p.isPremium
    ? (p.id === 206 ? 10 : p.id === 207 ? 5 : 2)
    : p.rarity === 'gold' ? 20 : 30,
}));
