'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Send, CheckCircle2 } from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import { useSubmitContactMutation } from '@/store/api/contactApi';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  email: z.string().trim().email('Enter a valid email'),
  institution: z.string().trim().max(150).optional(),
  // Optional here (unlike registration) — a visitor reaching out shouldn't
  // be blocked from sending a message just because they left phone blank,
  // but if they do fill it in it should still come out in a usable format.
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidPhoneNumber(v), 'Enter a valid phone number'),
  message: z.string().trim().min(10, 'Tell us a bit more (10+ characters)'),
  website: z.string().max(0).optional(), // honeypot
});

type Form = z.infer<typeof schema>;

const fieldCls = (err?: boolean) =>
  cn(
    'w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    err ? 'border-danger' : 'border-input'
  );

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitContact, { isLoading }] = useSubmitContactMutation();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const onSubmit = async (data: Form) => {
    try {
      await submitContact(data).unwrap();
      setSubmitted(true);
      reset();
    } catch (error: any) {
      toast.error(
        error?.data?.error?.message ||
          (error?.status === 'FETCH_ERROR'
            ? 'Cannot reach the server. Please try again, or email us directly.'
            : 'Could not send your message. Please try again.')
      );
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center sm:p-10">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 aria-hidden size={24} />
        </span>
        <h3 className="mt-4 text-lg font-semibold">Message sent</h3>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Thanks for reaching out — we usually reply within one business day.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-5 text-sm font-medium text-primary hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7" noValidate>
      {/* Honeypot — hidden from real users, catches basic bots. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        {...register('website')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Full name</Label>
          <input id="name" placeholder="Ahmed Raza" className={cn('mt-1.5', fieldCls(!!errors.name))} {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <input id="email" type="email" placeholder="you@institution.edu.pk" className={cn('mt-1.5', fieldCls(!!errors.email))} {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="institution">Institution <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <input id="institution" placeholder="Your school or college" className={cn('mt-1.5', fieldCls())} {...register('institution')} />
        </div>
        <div>
          <Label htmlFor="phone">Phone <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                id="phone"
                international
                labels={en}
                defaultCountry="PK"
                value={field.value}
                onChange={(v) => field.onChange(v ?? '')}
                placeholder="300 1234567"
                className={cn('mt-1.5', errors.phone && 'PhoneInput-danger')}
              />
            )}
          />
          {errors.phone && <p className="mt-1 text-xs text-danger">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="message">Message</Label>
        <textarea
          id="message"
          rows={5}
          placeholder="Tell us about your institution and what you'd like help with…"
          className={cn('mt-1.5 resize-none', fieldCls(!!errors.message))}
          {...register('message')}
        />
        {errors.message && <p className="mt-1 text-xs text-danger">{errors.message.message}</p>}
      </div>

      <Button type="submit" loading={isLoading} className="mt-5 w-full sm:w-auto">
        <Send aria-hidden size={16} /> Send message
      </Button>
    </form>
  );
}
