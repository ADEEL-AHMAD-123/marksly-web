import { baseApi } from './baseApi';

export type Channel = 'sms' | 'whatsapp';

export interface MessageLog {
  id: string;
  channel: Channel;
  to: string;
  message: string;
  status: 'sent' | 'failed' | 'mock';
  provider: string;
  error: string | null;
  createdAt: string;
}

export interface MessagingStatus {
  sms: string;
  whatsapp: string;
  configured: { twilio: boolean; meta: boolean; jazz: boolean };
}

export interface SendResult {
  total: number;
  sent: number;
  failed: number;
  provider: string;
  results: { to: string; status: string; error?: string }[];
}

export interface WhatsappCredits {
  bundleAllowance: number;
  bundleUsed: number;
  bundleRemaining: number;
  purchasedBalance: number;
  totalAvailable: number;
}

interface ApiList<T> { success: boolean; data: T[]; message: string; meta?: any }
interface ApiObject<T> { success: boolean; data: T; message: string }

export const messagingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMessagingStatus: builder.query<ApiObject<MessagingStatus>, void>({
      query: () => '/messaging/status',
      providesTags: [{ type: 'Messaging', id: 'STATUS' }],
    }),
    getMessageLog: builder.query<ApiList<MessageLog>, { page?: number; limit?: number } | void>({
      query: (p) => {
        const s = new URLSearchParams();
        if (p?.page) s.set('page', String(p.page));
        if (p?.limit) s.set('limit', String(p.limit));
        const qs = s.toString();
        return `/messaging${qs ? `?${qs}` : ''}`;
      },
      providesTags: [{ type: 'Messaging', id: 'LOG' }],
    }),
    sendMessage: builder.mutation<ApiObject<SendResult>, { channel: Channel; recipients: string[]; message: string }>({
      query: (body) => ({ url: '/messaging/send', method: 'POST', body }),
      // A send can consume WhatsApp credits — refresh the balance alongside
      // the log so the meter shown in MessagingView never lags behind an
      // actual successful send.
      invalidatesTags: [{ type: 'Messaging', id: 'LOG' }, { type: 'Messaging', id: 'WHATSAPP_CREDITS' }],
    }),
    getWhatsappCredits: builder.query<ApiObject<WhatsappCredits>, void>({
      query: () => '/notifications/whatsapp-credits',
      providesTags: [{ type: 'Messaging', id: 'WHATSAPP_CREDITS' }],
    }),
  }),
});

export const {
  useGetMessagingStatusQuery,
  useGetMessageLogQuery,
  useSendMessageMutation,
  useGetWhatsappCreditsQuery,
} = messagingApi;
