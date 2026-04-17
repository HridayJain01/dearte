import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from './AuthContext';
import { userService } from '../services/userService';

const CartContext = createContext(null);

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET':
      return { ...state, cart: action.payload, loading: false };
    case 'RESET':
      return { cart: { items: [], specialInstructions: '' }, loading: false };
    case 'LOADING':
      return { ...state, loading: true };
    default:
      return state;
  }
};

export function CartProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [state, dispatch] = useReducer(reducer, {
    cart: { items: [], specialInstructions: '' },
    loading: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'RESET' });
      return;
    }

    userService.cart().then((cart) => dispatch({ type: 'SET', payload: cart }));
  }, [isAuthenticated]);

  const syncAction = async (promise, message) => {
    try {
      const cart = await promise;
      dispatch({ type: 'SET', payload: cart });
      if (message) toast.success(message);
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Request failed';
      toast.error(msg);
    }
  };

  const value = useMemo(
    () => ({
      ...state,
      addToCart: (payload) => syncAction(userService.addToCart(payload), 'Added to cart'),
      updateCart: (itemId, payload) => syncAction(userService.updateCart(itemId, payload), 'Cart updated'),
      removeFromCart: (itemId) => syncAction(userService.removeFromCart(itemId), 'Removed from cart'),
      refreshCart: () => syncAction(userService.cart()),
    }),
    [state],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export { CartContext };
