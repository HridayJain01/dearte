import { createContext, useEffect, useMemo, useReducer, useRef } from 'react';
import toast from 'react-hot-toast';
import { markSessionEnded, markSessionStarted, onSessionExpired } from '../services/api';
import { userService } from '../services/userService';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  loading: true,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'RESTORE':
      return { ...state, user: action.payload, loading: false };
    case 'LOGIN':
      return { ...state, user: action.payload, loading: false };
    case 'LOGOUT':
      return { user: null, loading: false };
    case 'LOADING':
      return { ...state, loading: true };
    default:
      return state;
  }
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = state.user;
  }, [state.user]);

  useEffect(() => {
    let mounted = true;

    userService
      .me()
      .then((response) => {
        markSessionStarted(response.sessionExpiresAt);
        if (mounted) {
          dispatch({ type: 'RESTORE', payload: response.user || null });
        }
      })
      .catch(() => {
        markSessionEnded();
        if (mounted) {
          dispatch({ type: 'RESTORE', payload: null });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // The API client renews the session on its own; this only handles the case
  // where renewal is refused for good, so the UI stops claiming to be signed in.
  useEffect(
    () =>
      onSessionExpired(() => {
        if (!userRef.current) return;
        dispatch({ type: 'LOGOUT' });
        toast.error('Your session expired. Please sign in again.');
      }),
    [],
  );

  const login = async (payload) => {
    const response = await userService.login(payload);
    markSessionStarted(response.sessionExpiresAt);
    dispatch({ type: 'LOGIN', payload: response.user });
    toast.success(`Welcome back, ${response.user.name.split(' ')[0]}`);
    return response.user;
  };

  const register = async (payload) => {
    await userService.register(payload);
    toast.success('Registration submitted for activation');
  };

  const logout = async () => {
    await userService.logout().catch(() => null);
    markSessionEnded();
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out');
  };

  const value = useMemo(
    () => ({
      ...state,
      role: state.user?.role ?? 'guest',
      isAuthenticated: Boolean(state.user),
      login,
      register,
      logout,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
