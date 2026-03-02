import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../src/store/slices/api/baseApi';
import authReducer from '../src/store/slices/authSlice';
import uiReducer from '../src/store/slices/uiSlice';

function createMockStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
      ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
    preloadedState,
  });
}

export function ReduxDecorator(Story: React.ComponentType) {
  const mockStore = createMockStore({
    auth: {
      user: {
        id: '1',
        name: 'Admin User',
        empId: 'ADM-001',
        role: 'admin',
        email: 'admin@lms.com',
      },
      accessToken: 'mock-token',
      isAuthenticated: true,
    },
    ui: {
      sidebarOpen: true,
      mobileMenuOpen: false,
      toasts: [],
      activeModal: null,
    },
  });

  return (
    <Provider store={mockStore}>
      <Story />
    </Provider>
  );
}
