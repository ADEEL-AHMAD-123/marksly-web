'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useVerifyEmailMutation, useResendVerificationMutation } from '@/store/api/authApi';
import { Button } from '@/components/ui/button';
import { getErrorMessage, getErrorCode } from '@/lib/get-error-message';

type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [verifyEmail] = useVerifyEmailMutation();
  const [resendVerification, { isLoading: resending }] = useResendVerificationMutation();
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  // True when this exact link was already used — most commonly, clicked on
  // one device and then clicked again on another (or a second tab).
  // Nothing is actually wrong in that case, so it gets its own copy on the
  // success screen instead of pretending this click is what verified it.
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resent, setResent] = useState(false);
  // React 18 dev-mode double-invokes effects — without this guard, a single
  // page load could call verifyEmail() twice with the same one-time token,
  // and the second call would fail with "invalid or expired" even though
  // verification actually succeeded on the first call, confusing the user
  // with a false error right after a real success.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!token) {
      setStatus('error');
      setErrorMessage('This verification link is missing its token.');
      return;
    }
    verifyEmail({ token })
      .unwrap()
      .then((res) => {
        setAlreadyVerified(!!res?.data?.alreadyVerified);
        setStatus('success');
      })
      .catch((e: any) => {
        setStatus('error');
        setErrorMessage(getErrorMessage(e, 'This verification link is invalid or has expired — request a new one below.'));
      });
  }, [token, verifyEmail]);

  const [resendError, setResendError] = useState<string | null>(null);

  const onResend = async () => {
    if (!resendEmail.trim()) return;
    setResendError(null);
    try {
      await resendVerification({ email: resendEmail.trim() }).unwrap();
      setResent(true);
    } catch (error: any) {
      // resendVerification() itself always reports success to avoid leaking
      // account existence — but the rate limiter sitting in front of it is a
      // real, user-actionable error (RESEND_RATE_LIMIT/RATE_LIMIT), so that
      // one case should still surface instead of falsely claiming success.
      const code = getErrorCode(error);
      if (code === 'RESEND_RATE_LIMIT' || code === 'RATE_LIMIT') {
        setResendError(getErrorMessage(error, 'Too many requests — please wait a bit and try again.'));
        return;
      }
      setResent(true);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <Loader2 size={26} className="animate-spin" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Verifying your email…</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">This will just take a moment.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 size={28} />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {alreadyVerified ? 'Already verified' : 'Email verified'}
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          {alreadyVerified
            ? 'This email was already verified — probably from opening the link on another device. Your account is active, you can sign in.'
            : 'Your account is now active. You can sign in.'}
        </p>
        <Link href="/login" className="mt-6 inline-block">
          <Button size="lg">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <XCircle size={28} />
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Couldn&apos;t verify email</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{errorMessage}</p>

      {resent ? (
        <p className="mt-6 text-sm text-muted-foreground">
          If that account still needs verification, a new email is on its way — check your inbox.
        </p>
      ) : (
        <div className="mx-auto mt-6 max-w-xs">
          {/* Stacks vertically below the `sm` breakpoint so the email field
              never gets squeezed down to a handful of visible characters
              next to the button on a narrow phone — this card's own inner
              padding plus the page's outer padding leaves very little room
              for a side-by-side input+button at ~360px device widths. */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="Your registered email"
              dir="ltr"
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="button" loading={resending} onClick={onResend} className="w-full sm:w-auto">Resend</Button>
          </div>
          {resendError && <p className="mt-2 text-xs text-danger">{resendError}</p>}
        </div>
      )}

      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </div>
  );
}
