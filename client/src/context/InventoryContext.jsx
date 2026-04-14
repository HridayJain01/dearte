import { createContext, useMemo, useReducer } from 'react';

const InventoryContext = createContext(null);

const initialState = {
  sort: '',
  view: 'grid',
  filters: {
    subCategory: [],
    collection: [],
    metalColor: [],
    diamondMin: '',
    diamondMax: '',
    goldMin: '',
    goldMax: '',
    stockType: '',
  },
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_SORT':
      return { ...state, sort: action.payload };
    case 'SET_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.name]: action.payload.value,
        },
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};

export function InventoryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(
    () => ({
      ...state,
      setSort: (payload) => dispatch({ type: 'SET_SORT', payload }),
      setFilter: (name, value) => dispatch({ type: 'SET_FILTER', payload: { name, value } }),
      resetFilters: () => dispatch({ type: 'RESET' }),
    }),
    [state],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export { InventoryContext };
