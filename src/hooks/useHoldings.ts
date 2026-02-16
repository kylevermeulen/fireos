import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export interface Holding {
  id: string;
  account_id: string;
  symbol: string;
  name: string | null;
  quantity: number;
  cost_basis_native: number | null;
  cost_basis_aud: number | null;
  created_at: string;
  updated_at: string;
}

export interface Price {
  id: string;
  symbol: string;
  price_date: string;
  price: number;
  currency: 'AUD' | 'USD' | 'IDR';
  created_at: string;
}

export function useHoldings(accountId?: string) {
  const { user, sessionReady } = useAuth();

  return useQuery({
    queryKey: ['holdings', user?.id, accountId],
    queryFn: async () => {
      let query = supabase.from('holdings').select('*');
      if (accountId) {
        query = query.eq('account_id', accountId);
      }
      const { data, error } = await query.order('symbol');
      if (error) throw error;
      return data as Holding[];
    },
    enabled: sessionReady && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllHoldings() {
  const { user, sessionReady } = useAuth();

  return useQuery({
    queryKey: ['holdings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holdings')
        .select('*')
        .order('symbol');
      if (error) throw error;
      return data as Holding[];
    },
    enabled: sessionReady && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLatestPrices() {
  const { user, sessionReady } = useAuth();

  return useQuery({
    queryKey: ['prices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prices')
        .select('*')
        .order('price_date', { ascending: false });
      if (error) throw error;

      // Get latest price per symbol
      const latestBySymbol = new Map<string, Price>();
      for (const p of data as Price[]) {
        if (!latestBySymbol.has(p.symbol)) {
          latestBySymbol.set(p.symbol, p);
        }
      }
      return latestBySymbol;
    },
    enabled: sessionReady && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holding: {
      account_id: string;
      symbol: string;
      name?: string;
      quantity: number;
      cost_basis_native?: number;
      cost_basis_aud?: number;
    }) => {
      const { data, error } = await supabase
        .from('holdings')
        .insert(holding)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}

export function useUpdateHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      symbol?: string;
      name?: string;
      quantity?: number;
      cost_basis_native?: number;
      cost_basis_aud?: number;
    }) => {
      const { data, error } = await supabase
        .from('holdings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}

export function useDeleteHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}

export function useRefreshPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (symbols: string[]) => {
      const response = await supabase.functions.invoke('fetch-prices', {
        body: { symbols },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
    },
  });
}
