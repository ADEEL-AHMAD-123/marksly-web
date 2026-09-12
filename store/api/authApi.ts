import { baseApi } from './baseApi';

interface LoginRequest {
  // Phone or email — the login form lets the user toggle which one they're
  // typing (see LoginView.tsx), and auth.service.ts's login() detects which
  // by checking for '@'.
  identifier: string;
  password: string;
  institutionId?: string;
}

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
      roles?: string[];
      phone: string;
      email?: string;
      profilePhoto?: string;
      institutionId?: string;
      mustChangePassword?: boolean;
    };
  };
  message: string;
}

interface RegisterRequest {
  institutionName: string;
  institutionType: 'academy' | 'school' | 'college' | 'university';
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  email: string;
  password: string;
  city?: string;
}

export interface SessionInfo {
  sessionId: string;
  userAgent: string | null;
  createdAt: string;
  isCurrent: boolean;
}

interface RegisterResponse {
  success: boolean;
  data: {
    requiresVerification: true;
    email: string;
    institution: { id: string; slug: string; name: string };
  };
  message: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    verifyEmail: builder.mutation<{ success: boolean; data: { alreadyVerified: boolean } }, { token: string }>({
      query: (body) => ({ url: '/auth/verify-email', method: 'POST', body }),
    }),
    resendVerification: builder.mutation<void, { email: string }>({
      query: (body) => ({ url: '/auth/resend-verification', method: 'POST', body }),
    }),
    resendInviteSelf: builder.mutation<void, { email: string }>({
      query: (body) => ({ url: '/auth/resend-invite', method: 'POST', body }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    forgotPassword: builder.mutation<void, { email: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation<void, { token: string; newPassword: string; institutionId?: string }>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
    acceptInvite: builder.mutation<{ success: boolean; data: { firstName: string } }, { token: string; password: string }>({
      query: (body) => ({ url: '/auth/accept-invite', method: 'POST', body }),
    }),
    changePassword: builder.mutation<void, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),
    updateProfile: builder.mutation<
      { success: boolean; data: LoginResponse['data']['user']; message: string },
      { firstName?: string; lastName?: string; phone?: string }
    >({
      query: (body) => ({ url: '/auth/profile', method: 'PATCH', body }),
    }),
    // Email is a separate, password-confirmed, new-inbox-verified flow now —
    // see auth.service.ts's requestEmailChange()/confirmEmailChange() for
    // why. The email doesn't actually change until the confirmation link
    // (confirmEmailChange, below) is clicked.
    requestEmailChange: builder.mutation<void, { newEmail: string; currentPassword: string }>({
      query: (body) => ({ url: '/auth/request-email-change', method: 'POST', body }),
    }),
    confirmEmailChange: builder.mutation<{ success: boolean; data: { email: string }; message: string }, { token: string }>({
      query: (body) => ({ url: '/auth/confirm-email-change', method: 'POST', body }),
    }),
    getMe: builder.query<any, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
    switchRole: builder.mutation<LoginResponse, { role: string }>({
      query: (body) => ({ url: '/auth/switch-role', method: 'POST', body }),
    }),
    getSessions: builder.query<{ success: boolean; data: SessionInfo[] }, void>({
      query: () => '/auth/sessions',
      providesTags: ['Sessions'],
    }),
    revokeSession: builder.mutation<void, { sessionId: string }>({
      query: ({ sessionId }) => ({ url: `/auth/sessions/${sessionId}`, method: 'DELETE' }),
      invalidatesTags: ['Sessions'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useResendInviteSelfMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useAcceptInviteMutation,
  useChangePasswordMutation,
  useUpdateProfileMutation,
  useRequestEmailChangeMutation,
  useConfirmEmailChangeMutation,
  useGetMeQuery,
  useSwitchRoleMutation,
  useGetSessionsQuery,
  useRevokeSessionMutation,
} = authApi;
