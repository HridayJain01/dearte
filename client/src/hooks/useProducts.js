import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { productService } from '../services/productService';

export const useHomePage = () =>
  useQuery({
    queryKey: ['home'],
    queryFn: productService.home,
  });

export const useProducts = (params) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: () => productService.products(params),
    // Keep the current results on screen while the next filter combination
    // fetches, so changing a filter refines in place instead of blanking the
    // whole page out to a loader.
    placeholderData: keepPreviousData,
  });

export const useProduct = (styleCode) =>
  useQuery({
    queryKey: ['product', styleCode],
    queryFn: () => productService.product(styleCode),
    enabled: Boolean(styleCode),
  });

// `enabled` lets the header skip the buyer-only fetch for guests.
export const useCollections = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ['collections'],
    queryFn: productService.collections,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

export const useOccasions = () =>
  useQuery({
    queryKey: ['occasions'],
    queryFn: productService.occasions,
    staleTime: 5 * 60 * 1000,
  });

// Category -> sub category tree for the "Products" nav dropdown.
export const useNavCategories = () =>
  useQuery({
    queryKey: ['nav-categories'],
    queryFn: productService.navCategories,
    staleTime: 5 * 60 * 1000,
  });
