import { useMemo } from 'react';
import { useAllHoldings, useLatestPrices } from './useHoldings';

/**
 * Shared hook that calculates the current market value for each account
 * that has tracked holdings (shares × latest price).
 * Returns a Map<accountId, valueInNativeCurrency>.
 * 
 * Accounts without holdings will NOT appear in the map.
 */
export function useHoldingsValues() {
  const { data: allHoldings, isLoading: holdingsLoading } = useAllHoldings();
  const { data: priceMap, isLoading: pricesLoading } = useLatestPrices();

  const isLoading = holdingsLoading || pricesLoading;

  const holdingsValueByAccount = useMemo(() => {
    const map = new Map<string, number>();
    if (!allHoldings || !priceMap) return map;

    for (const h of allHoldings) {
      const price = priceMap.get(h.symbol);
      const value = h.quantity * (price?.price || 0);
      map.set(h.account_id, (map.get(h.account_id) || 0) + value);
    }

    return map;
  }, [allHoldings, priceMap]);

  return { holdingsValueByAccount, isLoading };
}
