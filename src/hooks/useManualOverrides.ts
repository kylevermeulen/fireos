import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import type { Json } from '@/integrations/supabase/types';

export interface ManualOverride {
  id: string;
  user_id: string;
  entity_type: string;
  entity_key: string;
  field_key: string;
  value_json: Json;
  effective_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertOverrideParams {
  entity_type: string;
  entity_key: string;
  field_key: string;
  value_json: Json;
  effective_from?: string | null;
}

/**
 * Hook to fetch all manual overrides for the current user
 */
export function useManualOverrides(entityType?: string) {
  const { user, sessionReady } = useAuth();

  return useQuery({
    queryKey: ['manual_overrides', user?.id, entityType],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('manual_overrides')
        .select('*')
        .eq('user_id', user.id);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ManualOverride[];
    },
    enabled: sessionReady && !!user?.id,
  });
}

/**
 * Hook to upsert a manual override
 */
export function useUpsertManualOverride() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: UpsertOverrideParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('manual_overrides')
        .upsert(
          [{
            user_id: user.id,
            entity_type: params.entity_type,
            entity_key: params.entity_key,
            field_key: params.field_key,
            value_json: params.value_json,
            effective_from: params.effective_from ?? null,
          }],
          { onConflict: 'user_id,entity_type,entity_key,field_key' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual_overrides'] });
      // Also invalidate mortgage data since it depends on overrides
      queryClient.invalidateQueries({ queryKey: ['mortgage_overrides'] });
    },
  });
}

/**
 * Hook to delete a manual override
 */
export function useDeleteManualOverride() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('manual_overrides')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual_overrides'] });
    },
  });
}

/**
 * Utility to get override value from a list of overrides
 */
export function getOverrideValue<T>(
  overrides: ManualOverride[] | undefined,
  entityType: string,
  entityKey: string,
  fieldKey: string,
  defaultValue: T
): T {
  if (!overrides) return defaultValue;
  
  const override = overrides.find(
    o => o.entity_type === entityType && 
         o.entity_key === entityKey && 
         o.field_key === fieldKey
  );
  
  if (override && override.value_json !== null && override.value_json !== undefined) {
    return override.value_json as T;
  }
  
  return defaultValue;
}
