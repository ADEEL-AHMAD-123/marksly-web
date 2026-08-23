import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './api/baseApi';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Required for `refetchOnFocus`/`refetchOnReconnect` (see baseApi.ts) to
// actually do anything — without this call they're silently no-ops. This is
// what makes a parent/student's portal view (attendance, results, fees)
// pick up changes a teacher/admin made in a *different* browser session:
// RTK Query's cache is local to each browser tab and tag invalidation never
// crosses sessions, so the only way stale-but-still-cached portal data ever
// gets refreshed without a manual reload is by refetching when the tab
// regains focus or the network comes back.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
