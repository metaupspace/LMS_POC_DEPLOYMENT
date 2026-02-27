import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// ─── Types ──────────────────────────────────────────────

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
}

interface UiState {
  sidebarOpen: boolean;
  activeModal: string | null;
  toasts: Toast[];
  isMobileMenuOpen: boolean;
}

// ─── Initial State ──────────────────────────────────────

const initialState: UiState = {
  sidebarOpen: true,
  activeModal: null,
  toasts: [],
  isMobileMenuOpen: false,
};

// ─── Slice ──────────────────────────────────────────────

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },

    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    openModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
    },

    closeModal: (state) => {
      state.activeModal = null;
    },

    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      state.toasts.push({
        ...action.payload,
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      });
    },

    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },

    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen;
    },

    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileMenuOpen = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  openModal,
  closeModal,
  addToast,
  removeToast,
  toggleMobileMenu,
  setMobileMenuOpen,
} = uiSlice.actions;
export default uiSlice.reducer;
