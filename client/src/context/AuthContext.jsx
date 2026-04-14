import { createContext, useEffect, useMemo, useReducer } from 'react';
import toast from 'react-hot-toast';
import { userService } from '../services/userService';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: localStorage.getItem('dearte-token'),
  loading: true,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'RESTORE':
      return { ...state, ...action.payload, loading: false };
    case 'LOGIN':
      return { ...state, ...action.payload, loading: false };
    case 'LOGOUT':
      return { user: null, token: null, loading: false };
    default:
      return state;
  }
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const rawUser = localStorage.getItem('dearte-user');
    const token = localStorage.getItem('dearte-token');

    if (rawUser && token) {
      dispatch({
        type: 'RESTORE',
        payload: { user: JSON.parse(rawUser), token },
      });
    } else {
      dispatch({ type: 'RESTORE', payload: { user: null, token: null } });
    }
  }, []);

  const login = async (payload) => {
    const response = await userService.login(payload);
    localStorage.setItem('dearte-token', response.token);
    localStorage.setItem('dearte-user', JSON.stringify(response.user));
    dispatch({ type: 'LOGIN', payload: { token: response.token, user: response.user } });
    toast.success(`Welcome back, ${response.user.name.split(' ')[0]}`);
    return response.user;
  };

  const register = async (payload) => {
    await userService.register(payload);
    toast.success('Registration submitted for activation');
  };

  const logout = async () => {
    await userService.logout().catch(() => null);
    localStorage.removeItem('dearte-token');
    localStorage.removeItem('dearte-user');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out');
  };

  const value = useMemo(
    () => ({
      ...state,
      role: state.user?.role ?? 'guest',
      isAuthenticated: Boolean(state.user && state.token),
      login,
      register,
      logout,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
