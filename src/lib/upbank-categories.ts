/**
 * Maps Up Bank category names to our internal L1/L2 category hierarchy.
 */
export interface CategoryMapping {
  l1: string;
  l2: string | null;
}

const UP_CATEGORY_MAP: Record<string, CategoryMapping> = {
  // Food & Drink
  'groceries':              { l1: 'Living Expenses', l2: 'Groceries' },
  'restaurants & cafes':    { l1: 'Living Expenses', l2: 'Eating Out' },
  'takeaway':               { l1: 'Living Expenses', l2: 'Eating Out' },
  'pubs & bars':            { l1: 'Living Expenses', l2: 'Eating Out' },
  'booze':                  { l1: 'Living Expenses', l2: 'Eating Out' },

  // Transport
  'taxis & share cars':     { l1: 'Transport', l2: 'Rideshare' },
  'public transport':       { l1: 'Transport', l2: 'Public Transport' },
  'car insurance, rego & maintenance': { l1: 'Transport', l2: 'Car' },
  'fuel':                   { l1: 'Transport', l2: 'Fuel' },
  'parking':                { l1: 'Transport', l2: 'Parking' },

  // Home
  'rent & mortgage':        { l1: 'Housing', l2: 'Rent' },
  'homeware & appliances':  { l1: 'Housing', l2: 'Homewares' },
  'home maintenance & improvements': { l1: 'Housing', l2: 'Maintenance' },
  'utilities':              { l1: 'Housing', l2: 'Utilities' },

  // Entertainment & Lifestyle
  'events & gigs':          { l1: 'Lifestyle', l2: 'Entertainment' },
  'games & software':       { l1: 'Lifestyle', l2: 'Subscriptions' },
  'tv, music & streaming':  { l1: 'Lifestyle', l2: 'Subscriptions' },
  'news, magazines & books':{ l1: 'Lifestyle', l2: 'Books & Media' },
  'holidays & travel':      { l1: 'Lifestyle', l2: 'Travel' },
  'fitness & wellbeing':    { l1: 'Lifestyle', l2: 'Health & Fitness' },
  'hair & beauty':          { l1: 'Lifestyle', l2: 'Personal Care' },
  'clothing & accessories': { l1: 'Lifestyle', l2: 'Clothing' },
  'gifts & charity':        { l1: 'Lifestyle', l2: 'Gifts' },
  'tobacco & vaping':       { l1: 'Lifestyle', l2: 'Other' },
  'adult':                  { l1: 'Lifestyle', l2: 'Other' },
  'lottery & gambling':     { l1: 'Lifestyle', l2: 'Other' },
  'pets':                   { l1: 'Lifestyle', l2: 'Pets' },

  // Health
  'health & medical':       { l1: 'Health', l2: 'Medical' },
  'life & disability insurance': { l1: 'Insurance', l2: 'Life' },

  // Financial
  'mobile phone':           { l1: 'Living Expenses', l2: 'Phone' },
  'internet':               { l1: 'Living Expenses', l2: 'Internet' },
  'education & student loans': { l1: 'Education', l2: null },

  // Income
  'salary':                 { l1: 'Income', l2: 'Salary' },
  'interest':               { l1: 'Income', l2: 'Interest' },
  'family allowance':       { l1: 'Income', l2: 'Government' },
};

/**
 * Look up an Up Bank category string and return our L1/L2.
 * Returns null if no mapping found.
 */
export function mapUpCategory(upCategory: string): CategoryMapping | null {
  if (!upCategory) return null;
  const key = upCategory.trim().toLowerCase();
  return UP_CATEGORY_MAP[key] ?? null;
}
