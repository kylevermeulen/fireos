import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useWealthSnapshots } from './useWealthData';
import { useCashflowData } from './useCashflowData';
import { useMemo } from 'react';
import { Json } from '@/integrations/supabase/types';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  target_date: string;
  metric_type: 'net_worth' | 'savings_rate' | 'category_spending' | 'liquid_wealth' | 'investments' | 'retirement' | 'custom';
  metric_config: Record<string, unknown>;
  display_order: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type GoalInsert = Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'current_value' | 'is_completed'>;
export type GoalUpdate = Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'user_id'>>;

export function useGoals() {
  const { user, sessionReady } = useAuth();

  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as Goal[];
    },
    enabled: sessionReady && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useGoalMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createGoal = useMutation({
    mutationFn: async (goal: Omit<GoalInsert, 'user_id'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('goals')
        .insert({
          title: goal.title,
          description: goal.description,
          target_value: goal.target_value,
          target_date: goal.target_date,
          metric_type: goal.metric_type,
          metric_config: goal.metric_config as Json,
          display_order: goal.display_order,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: GoalUpdate & { id: string }) => {
      const updatePayload: Record<string, unknown> = {};
      if (updates.title !== undefined) updatePayload.title = updates.title;
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.target_value !== undefined) updatePayload.target_value = updates.target_value;
      if (updates.target_date !== undefined) updatePayload.target_date = updates.target_date;
      if (updates.metric_type !== undefined) updatePayload.metric_type = updates.metric_type;
      if (updates.metric_config !== undefined) updatePayload.metric_config = updates.metric_config as Json;
      if (updates.display_order !== undefined) updatePayload.display_order = updates.display_order;
      if (updates.current_value !== undefined) updatePayload.current_value = updates.current_value;
      if (updates.is_completed !== undefined) updatePayload.is_completed = updates.is_completed;

      const { data, error } = await supabase
        .from('goals')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  return { createGoal, updateGoal, deleteGoal };
}

// Hook to get current metric values for goals
export function useGoalMetrics() {
  const { latestSnapshot } = useWealthSnapshots();
  const { rawTransactions } = useCashflowData();

  return useMemo(() => {
    // Calculate savings rate from transactions (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentTransactions = rawTransactions.filter(t => new Date(t.date) >= sixMonthsAgo);
    
    const income = recentTransactions
      .filter(t => t.direction === 'in' && t.L1 === 'Income' && t.is_internal_transfer === false)
      .reduce((sum, t) => sum + t.amount_aud, 0);
    
    const spend = recentTransactions
      .filter(t => t.direction === 'out' && t.is_internal_transfer === false)
      .reduce((sum, t) => sum + t.amount_aud, 0);
    
    const savingsRate = income > 0 ? ((income - spend) / income) * 100 : 0;

    return {
      net_worth: latestSnapshot?.netWorth ?? 0,
      liquid_wealth: latestSnapshot?.liquidWealth ?? 0,
      investments: (latestSnapshot?.investmentsAud ?? 0) + (latestSnapshot?.cryptoAud ?? 0),
      retirement: latestSnapshot?.retirementAud ?? 0,
      savings_rate: savingsRate,
    };
  }, [latestSnapshot, rawTransactions]);
}

export const METRIC_LABELS: Record<Goal['metric_type'], string> = {
  net_worth: 'Net Worth',
  savings_rate: 'Savings Rate (%)',
  category_spending: 'Category Spending',
  liquid_wealth: 'Liquid Wealth',
  investments: 'Investments',
  retirement: 'Retirement',
  custom: 'Custom',
};

export const METRIC_ICONS: Record<Goal['metric_type'], string> = {
  net_worth: '💰',
  savings_rate: '📈',
  category_spending: '🏷️',
  liquid_wealth: '💧',
  investments: '📊',
  retirement: '🏖️',
  custom: '🎯',
};
