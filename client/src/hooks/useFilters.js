import { useContext } from 'react';
import { InventoryContext } from '../context/InventoryContext';

export const useFilters = () => useContext(InventoryContext);
