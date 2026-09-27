import { useQuery } from '@tanstack/react-query';
import { aiService } from '../services/aiService';
import { useAuth } from './useAuth';

const NONE = {};

/**
 * Which AI controls to show this visitor. Everything is off while loading, on
 * any error, and against an API deployed before these features existed — an
 * AI control is optional, so its absence must never break the page around it.
 */
export function useAiFeatures() {
  const { user, loading } = useAuth();
  const { data } = useQuery({
    queryKey: ['ai-features', user?.id || 'guest'],
    queryFn: () => aiService.features().catch(() => NONE),
    enabled: !loading,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return data || NONE;
}
