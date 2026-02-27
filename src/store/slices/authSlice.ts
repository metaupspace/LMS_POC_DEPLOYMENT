import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// ─── Types ──────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  empId: string;
  role: string;
  email: string;
  firstLogin: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── LocalStorage Helpers ───────────────────────────────

const loadFromStorage = (): Partial<AuthState> => {
  if (typeof window === 'undefined') return {};
  try {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('user');
    const user = userStr ? (JSON.parse(userStr) as AuthUser) : null;
    return {
      accessToken,
      refreshToken,
      user,
      isAuthenticated: !!accessToken && !!user,
    };
  } catch {
    return {};
  }
};

const persistToStorage = (state: AuthState) => {
  if (typeof window === 'undefined') return;
  try {
    if (state.accessToken) {
      localStorage.setItem('accessToken', state.accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }
    if (state.refreshToken) {
      localStorage.setItem('refreshToken', state.refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
    if (state.user) {
      localStorage.setItem('user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('user');
    }
  } catch {
    // Storage unavailable
  }
};

const clearStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  } catch {
    // Storage unavailable
  }
};

// ─── Initial State ──────────────────────────────────────

const stored = loadFromStorage();

const initialState: AuthState = {
  user: stored.user ?? null,
  accessToken: stored.accessToken ?? null,
  refreshToken: stored.refreshToken ?? null,
  isAuthenticated: stored.isAuthenticated ?? false,
  isLoading: true,
};

// ─── Slice ──────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      persistToStorage(state);
    },

    setTokens: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      persistToStorage(state);
    },

    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      persistToStorage(state);
    },

    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      clearStorage();
    },

    hydrateAuth: (state) => {
      const stored = loadFromStorage();
      state.user = stored.user ?? null;
      state.accessToken = stored.accessToken ?? null;
      state.refreshToken = stored.refreshToken ?? null;
      state.isAuthenticated = stored.isAuthenticated ?? false;
      state.isLoading = false;
    },
  },
});

export const { setCredentials, setTokens, setUser, logout, hydrateAuth } = authSlice.actions;
export default authSlice.reducer;
