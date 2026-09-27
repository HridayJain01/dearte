import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from './AuthContext';
import { CartToast } from '../components/cart/CartToast';
import { userService } from '../services/userService';
import { errorMessage } from '../utils/errors';

const CartContext = createContext(null);

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET':
      return { ...state, cart: action.payload, loading: false, error: null };
    case 'RESET':
      return { cart: { items: [], specialInstructions: '' }, loading: false, error: null };
    case 'LOADING':
      return { ...state, loading: true };
    case 'ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
};

export function CartProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [state, dispatch] = useReducer(reducer, {
    cart: { items: [], specialInstructions: '' },
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'RESET' });
      return;
    }

    // Kept as `error` so the cart page can say why it's empty-handed rather
    // than claim the cart is empty.
    userService.cart().then(
      (cart) => dispatch({ type: 'SET', payload: cart }),
      (error) => dispatch({ type: 'ERROR', error }),
    );
  }, [isAuthenticated]);

  // `preview` upgrades the confirmation from a line of text to a card showing
  // the variant's photo. Only the caller knows which combination was added —
  // the response is the whole cart, and a merge into an existing line leaves
  // nothing new to point at — so the add-to-cart sites hand it over.
  const syncAction = async (promise, message, preview) => {
    try {
      const cart = await promise;
      dispatch({ type: 'SET', payload: cart });

      if (preview?.product) {
        toast.custom((t) => <CartToast id={t.id} {...preview} />);
      } else if (message) {
        toast.success(message);
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const value = useMemo(
    () => ({
      ...state,
      addToCart: (payload, preview) => syncAction(userService.addToCart(payload), 'Added to cart', preview),
      updateCart: (itemId, payload) => syncAction(userService.updateCart(itemId, payload), 'Cart updated'),
      removeFromCart: (itemId) => syncAction(userService.removeFromCart(itemId), 'Removed from cart'),
      refreshCart: () => syncAction(userService.cart()),
    }),
    [state],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export { CartContext };
