// College domain for email restriction
export const COLLEGE_DOMAIN = '@stu.upes.ac.in';

// App name
export const APP_NAME = 'GoodsMandi';

// Minimum bid percentage (70% of asking price)
export const MIN_BID_PERCENTAGE = 0.70;

// Max bid attempts (first bid + revisions) per user per listing; enforced in the database too
export const MAX_BID_ATTEMPTS = 3;

/** Smallest whole-rupee bid the database will accept (it requires >= ROUND(price * 0.70, 2)). */
export function minimumBid(askingPrice: number): number {
  return Math.ceil(Math.round(askingPrice * MIN_BID_PERCENTAGE * 100) / 100);
}

// Max photos per listing
export const MAX_PHOTOS_PER_LISTING = 5;

// Listing categories
export const LISTING_CATEGORIES = [
  'Books & Study Material',
  'Electronics & Gadgets',
  'Furniture & Room Essentials',
  'Cycles & Transport',
  'Appliances',
  'Clothing & Misc',
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

// Product age brackets
export const PRODUCT_AGE_BRACKETS = [
  'Under 6 months',
  '6-12 months',
  '1-2 years',
  '2+ years',
] as const;

export type ProductAgeBracket = (typeof PRODUCT_AGE_BRACKETS)[number];

// Report categories
export const REPORT_CATEGORIES = [
  'No-show',
  'Harassment',
  'Fake/Prohibited item',
  'Scam',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

// Listing statuses
export const LISTING_STATUSES = ['active', 'sold', 'removed'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

// Bid statuses
export const BID_STATUSES = ['pending', 'selected', 'rejected', 'backup'] as const;
export type BidStatus = (typeof BID_STATUSES)[number];

// Report statuses
export const REPORT_STATUSES = ['pending', 'confirmed', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// Prohibited keywords for listing content moderation
export const PROHIBITED_KEYWORDS = [
  'alcohol', 'beer', 'wine', 'liquor', 'vodka', 'whiskey', 'rum',
  'tobacco', 'cigarette', 'vape', 'e-cigarette',
  'drug', 'marijuana', 'weed', 'cannabis', 'cocaine', 'heroin',
  'weapon', 'gun', 'knife', 'sword', 'firearm', 'ammunition',
  'stolen', 'counterfeit', 'fake id', 'forged',
  'exam paper', 'leaked exam', 'answer key', 'cheat sheet',
  'pharmaceutical', 'prescription', 'controlled substance',
];

// Category icons mapping
export const CATEGORY_ICONS: Record<ListingCategory, string> = {
  'Books & Study Material': '📚',
  'Electronics & Gadgets': '💻',
  'Furniture & Room Essentials': '🪑',
  'Cycles & Transport': '🚲',
  'Appliances': '🔌',
  'Clothing & Misc': '👕',
};

// Category colors mapping
export const CATEGORY_COLORS: Record<ListingCategory, string> = {
  'Books & Study Material': 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
  'Electronics & Gadgets': 'from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400',
  'Furniture & Room Essentials': 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
  'Cycles & Transport': 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400',
  'Appliances': 'from-cyan-500/20 to-teal-500/20 border-cyan-500/30 text-cyan-400',
  'Clothing & Misc': 'from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400',
};
