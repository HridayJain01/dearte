import { useQuery } from '@tanstack/react-query';
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
  });

export const useProduct = (styleCode) =>
  useQuery({
    queryKey: ['product', styleCode],
    queryFn: () => productService.product(styleCode),
    enabled: Boolean(styleCode),
  });
