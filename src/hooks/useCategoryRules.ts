import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback, useEffect } from 'react';

export interface CategoryRule {
  id?: string;
  keyword: string;
  l1_category: string;
  l2_category: string | null;
  is_internal_transfer: boolean;
  needs_review: boolean;
  priority: number;
}

// Default rules to seed
const DEFAULT_RULES: Omit<CategoryRule, 'id'>[] = [
  // ── TRANSFER — INTERNAL ──
  { keyword: 'Transfer To R J VERMEULEN', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'Transfer To K C VERMEULEN', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'Transfer To Kyle Vermeulen', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'Offset Transfer Richenda Vermeulen', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'Wise Australia Pty Ltd', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'American Express Australia', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'Loan Repayment S.311', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'Repaymt A/C Tfr', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'PayID Payment Received', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'BPAY PAYMENT-THANK YOU', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'ONLINE PAYMENT RECEIVED', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'Transfer To Michael Ibrahim', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'Transfer To Hannah Schwartz', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'Wise Sydney', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'TARIK TUNAI ATM', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'TRF INCOMING BIFAST', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'PB KE RICHENDA', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'GO-PAY CUSTOMER', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 8 },
  { keyword: 'AshnaPocket', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 8 },
  { keyword: 'Transfer to other Bank', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 8 },

  // ── MORTGAGE ──
  { keyword: 'Loan Repayment S.311.2350776.01', l1_category: 'Mortgage', l2_category: 'Fixed Repayment', is_internal_transfer: false, needs_review: false, priority: 20 },
  { keyword: 'Loan Repayment S.311.2350776.00', l1_category: 'Mortgage', l2_category: 'Variable Repayment', is_internal_transfer: false, needs_review: false, priority: 20 },
  { keyword: 'Loan A/C Fee', l1_category: 'Utilities & Bills', l2_category: 'Australia Utility & Bill', is_internal_transfer: false, needs_review: false, priority: 15 },

  // ── RENT ──
  { keyword: 'Bali Rent (Amortized', l1_category: 'Rent', l2_category: 'Bali Rent', is_internal_transfer: false, needs_review: false, priority: 20 },
  { keyword: 'APT KF 642 TAMBLINGAN', l1_category: 'Rent', l2_category: 'Bali Rent', is_internal_transfer: false, needs_review: false, priority: 15 },

  // ── INCOME ──
  { keyword: 'NTEGRITY PTY LTD', l1_category: 'Income', l2_category: 'Salary', is_internal_transfer: false, needs_review: false, priority: 20 },
  { keyword: 'JC Port Phillip', l1_category: 'Income', l2_category: 'Rental Income', is_internal_transfer: false, needs_review: false, priority: 20 },
  { keyword: 'MCARE BENEFITS', l1_category: 'Income', l2_category: 'Other', is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'PENDAPATAN BUNGA', l1_category: 'Income', l2_category: 'Other', is_internal_transfer: false, needs_review: false, priority: 10 },

  // ── FOOD DELIVERY & TAXI ──
  { keyword: 'GRAB', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'GOJEK', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'GO-FOOD', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'GOCAR', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'Bluebird', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'Purchase Visa+', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 2 },

  // ── RESTAURANTS, CAFES & BARS ──
  { keyword: 'QR PAYMENT', l1_category: 'Restaurants, Cafes & Bars', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 3 },
  { keyword: 'PURCHASE ALTO', l1_category: 'Restaurants, Cafes & Bars', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'PURCHASE DI PESCADO', l1_category: 'Restaurants, Cafes & Bars', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'PURCHASE', l1_category: 'Restaurants, Cafes & Bars', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 1 },
  { keyword: 'HANOI ROSE', l1_category: 'Restaurants, Cafes & Bars', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'KTOWN HOSPITALITY', l1_category: 'Restaurants, Cafes & Bars', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },

  // ── GROCERIES ──
  { keyword: 'WOOLWORTHS', l1_category: 'Groceries', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'COLES', l1_category: 'Groceries', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'MARLEYSPOON', l1_category: 'Groceries', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'HAPPYFRESH', l1_category: 'Groceries', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'QR PAYMENT CPM ALFA', l1_category: 'Groceries', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'QR PAYMENT INDOMARET', l1_category: 'Groceries', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'Coco Mart', l1_category: 'Groceries', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'POPULAR MARKET', l1_category: 'Groceries', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'PEPITO MARKET', l1_category: 'Groceries', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'GOURMET GARAGE', l1_category: 'Groceries', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'SPARKLE FRUIT', l1_category: 'Groceries', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },

  // ── UTILITIES & BILLS ──
  { keyword: 'AUSPOST Mail Redirect', l1_category: 'Utilities & Bills', l2_category: 'Australia Utility & Bill', is_internal_transfer: false, needs_review: false, priority: 15 },
  { keyword: 'GLOBALXTREME', l1_category: 'Utilities & Bills', l2_category: 'Indonesia Utility & Bills', is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'DOKU', l1_category: 'Utilities & Bills', l2_category: 'Indonesia Utility & Bills', is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'Biaya Adm Bulanan', l1_category: 'Utilities & Bills', l2_category: 'Indonesia Utility & Bills', is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'PB Biaya SMS', l1_category: 'Utilities & Bills', l2_category: 'Indonesia Utility & Bills', is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'TRF BIFAST KE LISA MICHELLE CROSBY', l1_category: 'Utilities & Bills', l2_category: 'Indonesia Utility & Bills', is_internal_transfer: false, needs_review: false, priority: 15 },
  { keyword: 'LISA MICHELLE CROSBY', l1_category: 'Utilities & Bills', l2_category: 'Indonesia Utility & Bills', is_internal_transfer: false, needs_review: false, priority: 8 },

  // ── HOUSEHOLD ──
  { keyword: 'AIRTASKER', l1_category: 'Household', l2_category: 'Maintenance', is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'Relay Tenancy', l1_category: 'Household', l2_category: 'Maintenance', is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'BUNNINGS', l1_category: 'Household', l2_category: 'Maintenance', is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'DWI RISNAWATI', l1_category: 'Household', l2_category: 'Staff', is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'TRF BIFAST KE DWI', l1_category: 'Household', l2_category: 'Staff', is_internal_transfer: false, needs_review: false, priority: 12 },

  // ── SCHOOL FEES ──
  { keyword: 'BOUNDLESS LIFE', l1_category: 'School Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'LORETO MANDEVILLE', l1_category: 'School Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'INTEGRAPAY*CLARKCHILDCN', l1_category: 'School Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'PORT MELBOURNE PRIMARY', l1_category: 'School Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'KIDDOCARE', l1_category: 'School Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'CLARK CHILD', l1_category: 'School Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },

  // ── FAMILY ──
  { keyword: 'THE HOOP SCHOOL', l1_category: 'Family', l2_category: 'Kids Activities', is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'BABY BUNTING', l1_category: 'Family', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: '842 TOY WORLD', l1_category: 'Family', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'Micah Pocket', l1_category: 'Family', l2_category: 'Kids Pocket Money', is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'Ash Monthly Spend', l1_category: 'Family', l2_category: 'Kids Pocket Money', is_internal_transfer: false, needs_review: false, priority: 10 },

  // ── SHOPPING ──
  { keyword: 'TOKOPEDIA', l1_category: 'Shopping', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'TECHNO COMPUTER', l1_category: 'Shopping', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'FRANK GREEN', l1_category: 'Shopping', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'EMMA JANE HARDEE', l1_category: 'Shopping', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'AUSPOST', l1_category: 'Shopping', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 3 },

  // ── HEALTH & FITNESS ──
  { keyword: 'HCFHEALTH', l1_category: 'Health & Fitness', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'GETMOSH', l1_category: 'Health & Fitness', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'QI HEALING MASSAGE', l1_category: 'Health & Fitness', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },

  // ── PERSONAL CARE ──
  { keyword: 'THE SHAMPOO LOUNGE', l1_category: 'Personal Care', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },

  // ── ENTERTAINMENT ──
  { keyword: 'CRUNCHLABS', l1_category: 'Entertainment', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'OZ LOTTERIES', l1_category: 'Entertainment', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },

  // ── SUBSCRIPTIONS ──
  { keyword: 'NETFLIX', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'SPOTIFY', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'ADOBE', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'APPLE.COM/BILL', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'GOOGLE', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 3 },
  { keyword: 'DROPBOX', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'CANVA', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'OPENAI', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'ANTHROPIC', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'HEVY', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },

  // ── TRAVEL ──
  { keyword: 'LOTTE TRAVEL RETAIL', l1_category: 'Travel', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'MIDSTAY', l1_category: 'Travel', l2_category: 'Accommodation', is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'AIRBNB', l1_category: 'Travel', l2_category: 'Accommodation', is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'BOOKING.COM', l1_category: 'Travel', l2_category: 'Accommodation', is_internal_transfer: false, needs_review: false, priority: 5 },

  // ── INSURANCE ──
  { keyword: 'TAL LIFE INSURANCE', l1_category: 'Insurance', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'YOUI', l1_category: 'Insurance', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'AAMI', l1_category: 'Insurance', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'WORLD NOMADS', l1_category: 'Insurance', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },

  // ── TAXES & GOVT FEES ──
  { keyword: 'TAX OFFICE PAYMENTS', l1_category: 'Taxes & Govt Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'ANNUAL CARD FEE', l1_category: 'Taxes & Govt Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'PAJAK ATAS BUNGA', l1_category: 'Taxes & Govt Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'PENERIMAAN NEGARA', l1_category: 'Taxes & Govt Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'International Transaction Fee', l1_category: 'Taxes & Govt Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'CENTRELINK', l1_category: 'Taxes & Govt Fees', l2_category: null, is_internal_transfer: false, needs_review: true, priority: 5 },

  // ── PROFESSIONAL SERVICES ──
  { keyword: 'FINDEX', l1_category: 'Professional Services', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'MR GREG MALHAM', l1_category: 'Professional Services', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'CRYPTOTAXCALCULATOR', l1_category: 'Professional Services', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'JUSTANSWER', l1_category: 'Professional Services', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'HORSHAM CAPITAL', l1_category: 'Professional Services', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'TRF BIFAST KE VALLEN', l1_category: 'Professional Services', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },

  // ── DONATIONS ──
  { keyword: 'STROKE FOUNDATION', l1_category: 'Donations', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'OCRF', l1_category: 'Donations', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'DEMENTIA AUSTRALIA', l1_category: 'Donations', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'CANCER COUNCIL', l1_category: 'Donations', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'SP GREENFLEET', l1_category: 'Donations', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },

  // ── INVESTING ──
  { keyword: 'CoinJar', l1_category: 'Investing', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },

  // ── FOOD DELIVERY & TAXI ──
  { keyword: 'UBER EATS', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'UBER *EATS', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'UBER TRIP', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'UBER *TRIP', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'Gopay-Gojek', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'DOORDASH', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'LIME*RIDE', l1_category: 'Food Delivery & Taxi', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },

  // ── FAMILY ──
  { keyword: 'Monthly Spend', l1_category: 'Family', l2_category: 'Kids Pocket Money', is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'Ash Save', l1_category: 'Family', l2_category: 'Kids Pocket Money', is_internal_transfer: false, needs_review: false, priority: 10 },

  // ── TRANSFER — INTERNAL ──
  { keyword: 'Spending', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 5 },
  { keyword: 'KYLE CHRISTOPHER VER', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'Kyle Vermeulen', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 10 },
  { keyword: 'PT BANK PERMATA', l1_category: 'Transfer — Internal', l2_category: null, is_internal_transfer: true, needs_review: false, priority: 8 },

  // ── TRAVEL ──
  { keyword: 'VIRGIN AUSTRALIA', l1_category: 'Travel', l2_category: 'Flights', is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'UNITED AIRLINES', l1_category: 'Travel', l2_category: 'Flights', is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'ALASKA A', l1_category: 'Travel', l2_category: 'Flights', is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'GG VA Inflight', l1_category: 'Travel', l2_category: 'Flights', is_internal_transfer: false, needs_review: false, priority: 8 },

  // ── SHOPPING ──
  { keyword: 'AMAZON', l1_category: 'Shopping', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'THE ICONIC', l1_category: 'Shopping', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'ETSY', l1_category: 'Shopping', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'NORDSTROM', l1_category: 'Shopping', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },
  { keyword: 'PATAGONIA', l1_category: 'Shopping', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 5 },

  // ── SUBSCRIPTIONS ──
  { keyword: 'UBER ONE', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
  { keyword: 'NEW YORK TIMES', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'PATREON', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'DISNEY+', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'DISNEY PLUS', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'KINDLE', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'REDDIT', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'ENVATO', l1_category: 'Subscriptions', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },

  // ── NTEGRITY ──
  { keyword: 'LOVABLE', l1_category: 'Ntegrity', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },

  // ── UTILITIES & BILLS ──
  { keyword: 'POWERSHOP', l1_category: 'Utilities & Bills', l2_category: 'Australia Utility & Bill', is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'SOUTH EAST WATER', l1_category: 'Utilities & Bills', l2_category: 'Australia Utility & Bill', is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'TELSTRA', l1_category: 'Utilities & Bills', l2_category: 'Australia Utility & Bill', is_internal_transfer: false, needs_review: false, priority: 8 },

  // ── RESTAURANTS, CAFES & BARS ──
  { keyword: 'LIVIT HUB BALI', l1_category: 'Restaurants, Cafes & Bars', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'Bridge Road Brewers', l1_category: 'Restaurants, Cafes & Bars', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'COLONIAL BREWING', l1_category: 'Restaurants, Cafes & Bars', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },

  // ── HEALTH & FITNESS ──
  { keyword: 'CHEMIST WAREHOUSE', l1_category: 'Health & Fitness', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },
  { keyword: 'IMAGING AT OLYMPIC', l1_category: 'Health & Fitness', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },

  // ── ENTERTAINMENT ──
  { keyword: 'TICKETMASTER', l1_category: 'Entertainment', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 8 },

  // ── TAXES & GOVT FEES ──
  { keyword: 'International Transaction Fee', l1_category: 'Taxes & Govt Fees', l2_category: null, is_internal_transfer: false, needs_review: false, priority: 10 },
];

export function useCategoryRules() {
  const { toast } = useToast();
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('category_rules')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      setRules(data ?? []);
    } catch (err) {
      console.error('Failed to fetch category rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const seedRules = useCallback(async () => {
    setIsSeeding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const toInsert = DEFAULT_RULES.map(r => ({ ...r, user_id: user.id }));

      // Upsert to avoid duplicates
      const { error } = await supabase
        .from('category_rules')
        .upsert(toInsert, { onConflict: 'user_id,keyword' });
      if (error) throw error;

      toast({ title: 'Category rules seeded', description: `${toInsert.length} rules created/updated` });
      await fetchRules();
    } catch (err) {
      console.error('Seed rules error:', err);
      toast({ title: 'Failed to seed rules', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsSeeding(false);
    }
  }, [fetchRules, toast]);

  /**
   * Apply rules to a description string. Returns the best matching rule
   * (longest keyword match with highest priority wins).
   */
  const applyRules = useCallback((description: string): CategoryRule | null => {
    if (!description || rules.length === 0) return null;

    const upper = description.toUpperCase();
    let bestMatch: CategoryRule | null = null;
    let bestLen = 0;

    for (const rule of rules) {
      const kw = rule.keyword.toUpperCase();
      if (upper.includes(kw)) {
        // Prefer longer keywords, then higher priority
        if (kw.length > bestLen || (kw.length === bestLen && rule.priority > (bestMatch?.priority ?? 0))) {
          bestMatch = rule;
          bestLen = kw.length;
        }
      }
    }

    return bestMatch;
  }, [rules]);

  return { rules, isLoading, isSeeding, seedRules, applyRules, fetchRules };
}
