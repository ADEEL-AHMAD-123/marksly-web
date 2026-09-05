'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useConfirmEmailChangeMutation } from '@/store/api/authApi';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/get-error-message';

type Status = 'confirming' | 'success' | 'error';

export function ConfirmEmailChangeView() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [confirmEmailChange] = useConfirmEmailChangeMutation();
  const [status, setStatus] = useState<Status>('confirming');
  const [errorMessage, setErrorMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');
  // Same double-invoke guard VerifyEmailView uses — this is a one-time
  // token, so React 18 dev-mode's double effect run must not fire it twice.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!token) {
      setStatus('error');
      setErrorMessage('This confirmation link is missing its token.');
      return;
    }
    confirmEmailChange({ token })
      .unwrap()
      .then((res) => {
        setNewEmail(res.data.email);
        setStatus('success');
      })
      .catch((e: any) => {
        setStatus('error');
        setErrorMessage(getErrorMessage(e, 'This confirmation link is invalid or has expired — request the email change again from Settings.'));
      });
  }, [token, confirmEmailChange]);

  if (status === 'confirming') {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
          <Loader2 size={26} className="animate-spin" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Confirming your new email…</h1>
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Email updated</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Your account's email is now <span className="font-medium text-foreground">{newEmail}</span>. For security,
          every device signed in has been signed out — please sign in again.
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
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Couldn&apos;t confirm email change</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{errorMessage}</p>
      <Link href="/login" className="mt-6 inline-block">
        <Button size="lg" variant="secondary">Back to sign in</Button>
      </Link>
    </div>
  );
}
