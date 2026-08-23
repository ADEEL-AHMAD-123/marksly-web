import { baseApi } from './baseApi';

interface ContactRequest {
  name: string;
  email: string;
  institution?: string;
  phone?: string;
  message: string;
  /** Honeypot — must stay empty; hidden from real users via CSS. */
  website?: string;
}

interface ContactResponse {
  success: boolean;
  data: null;
  message: string;
}

export const contactApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    submitContact: builder.mutation<ContactResponse, ContactRequest>({
      query: (body) => ({ url: '/contact', method: 'POST', body }),
    }),
  }),
});

export const { useSubmitContactMutation } = contactApi;
