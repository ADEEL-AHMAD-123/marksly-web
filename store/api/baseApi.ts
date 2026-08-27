import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';
import { updateAccessToken, logout } from '../slices/authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  credentials: 'include', // sends httpOnly refresh token cookie
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// ─── Auto-refresh on 401 ──────────────────────────────────────────────────────
// The backend rotates the refresh token on every use and rejects reuse of an
// already-consumed one (session-hijack protection). That means if several
// requests 401 at the same moment (e.g. a dashboard firing 5 queries at
// once), each independently calling /auth/refresh would race: only the first
// succeeds, and every other concurrent refresh gets rejected as token reuse
// — logging the user out even though their session was perfectly valid.
// Share a single in-flight refresh promise across all callers instead.
let refreshPromise: Promise<string | null> | null = null;

async function getRefreshedToken(api: any, extraOptions: any): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshResult = await baseQuery({ url: '/auth/refresh', method: 'POST' }, api, extraOptions);
      if (refreshResult.data) {
        const token = (refreshResult.data as any).data.accessToken as string;
        api.dispatch(updateAccessToken(token));
        return token;
      }
      return null;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      const token = await getRefreshedToken(api, extraOptions);
      if (token) {
        // Retry original query now that every caller shares the new token.
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed — logout
        api.dispatch(logout());
      }
    }

    return result;
  };

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  // Tag invalidation (see the `invalidatesTags`/`providesTags` throughout
  // this folder) only ever fires within the SAME browser session that
  // triggered the mutation — it cannot and does not reach a different
  // user's already-open tab. A parent viewing their child's attendance and
  // a teacher marking it are two different sessions entirely, so the only
  // way the parent's cached (but stale) view ever updates without a manual
  // reload is by refetching on focus/reconnect. Requires
  // `setupListeners(store.dispatch)` in store/index.ts to actually work.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: [
    'Auth',
    'Students',
    'Classes',
    'Attendance',
    'Fees',
    'Exams',
    'Results',
    'Notices',
    'Users',
    'Institutions',
    'Subjects',
    'Messaging',
    'Billing',
    'Inbox',
  ],
  endpoints: () => ({}),
});
