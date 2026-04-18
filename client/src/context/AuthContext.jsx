import { createContext, useEffect, useMemo, useReducer } from 'react';
import toast from 'react-hot-toast';
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

  useEffect(() => {
    let mounted = true;

    userService
      .me()
      .then((response) => {
        if (mounted) {
          dispatch({ type: 'RESTORE', payload: response.user || null });
        }
      })
      .catch(() => {
        if (mounted) {
          dispatch({ type: 'RESTORE', payload: null });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (payload) => {
    const response = await userService.login(payload);
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
