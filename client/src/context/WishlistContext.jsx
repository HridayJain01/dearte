import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from './AuthContext';
import { userService } from '../services/userService';
import { errorMessage } from '../utils/errors';

const WishlistContext = createContext(null);

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET':
      return { ...state, wishlist: action.payload, loading: false, error: null };
    case 'RESET':
      return { wishlist: { collections: [], items: [] }, loading: false, error: null };
    case 'ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
};

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [state, dispatch] = useReducer(reducer, {
    wishlist: { collections: [], items: [] },
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'RESET' });
      return;
    }

    userService.wishlist().then(
      (wishlist) => dispatch({ type: 'SET', payload: wishlist }),
      (error) => dispatch({ type: 'ERROR', error }),
    );
  }, [isAuthenticated]);

  // Resolves true on success. A failure is toasted with its reason; it used to
  // be an unhandled rejection, so a failed save looked like nothing happened.
  const syncAction = async (promise, message) => {
    try {
      const wishlist = await promise;
      dispatch({ type: 'SET', payload: wishlist });
      if (message) toast.success(message);
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  };

  const value = useMemo(
    () => ({
      ...state,
      addToWishlist: (payload) => syncAction(userService.addToWishlist(payload), 'Added to wishlist'),
      removeFromWishlist: (itemId) => syncAction(userService.removeFromWishlist(itemId), 'Removed from wishlist'),
      createWishlistCollection: (payload) =>
        syncAction(userService.createWishlistCollection(payload), 'Wishlist collection created'),
      refreshWishlist: () => syncAction(userService.wishlist()),
    }),
    [state],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export { WishlistContext };
