import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from './AuthContext';
import { userService } from '../services/userService';

const WishlistContext = createContext(null);

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET':
      return { ...state, wishlist: action.payload, loading: false };
    case 'RESET':
      return { wishlist: { collections: [], items: [] }, loading: false };
    default:
      return state;
  }
};

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [state, dispatch] = useReducer(reducer, {
    wishlist: { collections: [], items: [] },
    loading: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'RESET' });
      return;
    }

    userService.wishlist().then((wishlist) => dispatch({ type: 'SET', payload: wishlist }));
  }, [isAuthenticated]);

  const syncAction = async (promise, message) => {
    const wishlist = await promise;
    dispatch({ type: 'SET', payload: wishlist });
    if (message) toast.success(message);
  };

  const value = useMemo(
    () => ({
      ...state,
      addToWishlist: (payload) => syncAction(userService.addToWishlist(payload), 'Added to wishlist'),
      removeFromWishlist: (itemId) => syncAction(userService.removeFromWishlist(itemId), 'Removed from wishlist'),
      createWishlistCollection: (payload) =>
        syncAction(userService.createWishlistCollection(payload), 'Wishlist collection created'),
    }),
    [state],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export { WishlistContext };
