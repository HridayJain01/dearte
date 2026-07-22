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

export const useCollections = () =>
  useQuery({
    queryKey: ['collections'],
    queryFn: productService.collections,
  });

export const useOccasions = () =>
  useQuery({
    queryKey: ['occasions'],
    queryFn: productService.occasions,
    staleTime: 5 * 60 * 1000,
  });
