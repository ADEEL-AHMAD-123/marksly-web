'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, AlertCircle, MailWarning, MailQuestion, Building2, ChevronRight, Phone as PhoneIcon, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLoginMutation, useResendVerificationMutation, useResendInviteSelfMutation } from '@/store/api/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { roleHome } from '@/lib/role-routes';
import { getErrorMessage, getErrorCode, getErrorDetails } from '@/lib/get-error-message';

// Same phone can legitimately belong to accounts at more than one
// institution (e.g. a parent with kids at two different schools) — phone
// is only unique PER institution, not globally (see user.model.ts). When
// that same phone + password combination matches more than one account,
// the backend can't guess which one you meant and returns this instead of
// silently picking one (see auth.service.ts's login()).
interface AmbiguousAccountOption {
  institutionId: string;
  institutionName: string;
  role: string;
}

// Registration (and every other phone-collecting form — StudentFormDrawer,
// AddTeacherDrawer, etc.) stores phone numbers in E.164 via this same
// react-phone-number-input component, which strips the local trunk prefix
// (e.g. "0300 1234567" -> "+923001234567" for PK) before it ever reaches
// the backend. Login used to be a plain <input type="tel"> with no such
// normalization — so a user who registered as "+923001234567" and then
// tried to log in by typing "0300 1234567" or "03001234567" got an exact
// server-side string mismatch and no way to know why. Using the same
// component here means whatever the user types is normalized the same way
// on both ends, so it actually matches what's stored.
// Email is now mandatory for every account (register + every admin-created
// user form), so it works as a second login identifier alongside phone —
// offered as an explicit toggle (not an auto-detecting single field) so
// the input control itself (PhoneInput vs. a plain email field) always
// matches what the user is trying to type, per the user's own preference.
const loginSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('phone'),
    phone: z
      .string()
      .min(1, 'Enter a valid phone number')
      .refine((v) => isValidPhoneNumber(v), 'Enter a valid phone number'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
  z.object({
    mode: z.literal('email'),
    email: z.string().min(1, 'Enter your email address').email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
]);

type LoginForm = z.infer<typeof loginSchema>;

export function LoginView() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [needsInviteResend, setNeedsInviteResend] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [accountOptions, setAccountOptions] = useState<AmbiguousAccountOption[] | null>(null);
  const [login, { isLoading }] = useLoginMutation();
  const [resendVerification, { isLoading: resending }] = useResendVerificationMutation();
  const [resendInviteSelf, { isLoading: resendingInvite }] = useResendInviteSelfMutation();

  // Email is the default — it's the mandatory, always-present identifier
  // for every account, whereas phone formatting/country varies more and is
  // the secondary option here.
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('email');

  const {
    register,
    control,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { mode: 'email', email: '', password: '' } as LoginForm,
  });

  const onToggleMode = (next: 'phone' | 'email') => {
    if (next === loginMode) return;
    setFormError(null);
    setNeedsVerification(false);
    setNeedsInviteResend(false);
    setLoginMode(next);
    // Swap the discriminant + clear the identifier field rather than
    // leaving a stale `phone` value sitting around under an `email` mode
    // (or vice versa) — the resolver would otherwise validate a field
    // that's no longer even rendered.
    reset(
      next === 'phone'
        ? ({ mode: 'phone', phone: '', password: getValues('password') ?? '' } as LoginForm)
        : ({ mode: 'email', email: '', password: getValues('password') ?? '' } as LoginForm)
    );
  };

  const completeLogin = async (data: LoginForm & { institutionId?: string }) => {
    const identifier = data.mode === 'phone' ? data.phone : data.email;
    const result = await login({ identifier, password: data.password, institutionId: data.institutionId }).unwrap();
    dispatch(setCredentials({ user: result.data.user, accessToken: result.data.accessToken }));
    toast.success(`Welcome back, ${result.data.user.firstName}!`);
    router.push(roleHome(result.data.user.role));
  };

  const onSubmit = async (data: LoginForm) => {
    setFormError(null);
    setNeedsVerification(false);
    setNeedsInviteResend(false);
    setAccountOptions(null);
    try {
      await completeLogin(data);
    } catch (error: any) {
      if (getErrorCode(error) === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true);
        setFormError(getErrorMessage(error, 'Please verify your email before logging in.'));
        return;
      }
      if (getErrorCode(error) === 'ACCOUNT_PENDING_INVITE') {
        setNeedsInviteResend(true);
        setFormError(getErrorMessage(error, 'This account is waiting for you to finish setup — check your inbox for the activation link.'));
        // Pre-fill with whatever they just tried to log in with, if it was
        // the email field — saves retyping it into the resend box below.
        if (data.mode === 'email') setResendEmail(data.email);
        return;
      }
      if (getErrorCode(error) === 'MULTIPLE_ACCOUNTS') {
        const details = getErrorDetails<{ institutions: AmbiguousAccountOption[] }>(error);
        if (details?.institutions?.length) {
          setAccountOptions(details.institutions);
          return;
        }
      }
      setFormError(getErrorMessage(error, 'That phone number/email and password don’t match — please check and try again.'));
    }
  };

  const onSelectInstitution = async (institutionId: string) => {
    setFormError(null);
    try {
      await completeLogin({ ...getValues(), institutionId });
    } catch (error: any) {
      setAccountOptions(null);
      setFormError(getErrorMessage(error, 'That phone number and password don’t match — please check and try again.'));
    }
  };

  const onResend = async () => {
    if (!resendEmail.trim()) { toast.error('Enter the email you registered with'); return; }
    try {
      await resendVerification({ email: resendEmail.trim() }).unwrap();
      toast.success('Verification email sent — check your inbox.');
    } catch (error: any) {
      // Show the real reason (e.g. rate-limited) instead of always claiming
      // a generic failure — a throttled user deserves to know why nothing
      // arrived rather than being told to "try again in a moment" forever.
      toast.error(getErrorMessage(error, 'Could not resend the email. Please try again in a moment.'));
    }
  };

  const onResendInvite = async () => {
    if (!resendEmail.trim()) { toast.error('Enter the email your account was added with'); return; }
    try {
      await resendInviteSelf({ email: resendEmail.trim() }).unwrap();
      toast.success('Activation email sent — check your inbox.');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Could not resend the email. Please try again in a moment.'));
    }
  };

  if (accountOptions) {
    return (
      <div>
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Which institution?</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This phone number/email and password match more than one account. Pick the one you want to sign in to.
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-2">
          {accountOptions.map((opt) => (
            <button
              key={opt.institutionId}
              type="button"
              disabled={isLoading}
              onClick={() => onSelectInstitution(opt.institutionId)}
              className="flex w-full items-center gap-3 rounded-lg border border-input bg-card px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Building2 size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{opt.institutionName}</span>
                <span className="block text-xs capitalize text-muted-foreground">{opt.role}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAccountOptions(null)}
          className="mt-6 text-sm font-medium text-primary hover:underline"
        >
          Use a different phone number/email or password
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to your Marksly account to continue.
        </p>
      </div>

      {formError && !needsVerification && !needsInviteResend && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {needsVerification && (
        <div
          role="alert"
          className="mb-5 space-y-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning"
        >
          <div className="flex items-start gap-2.5">
            <MailWarning size={17} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
          <div className="flex gap-2">
            {/* min-w-0 is needed on a flex child input — without it, the
                browser's default min-width:auto can push this wider than
                its flex-basis and overflow the card on a narrow phone. */}
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="Your registered email"
              dir="ltr"
              className="h-9 min-w-0 flex-1 rounded-md border border-warning/30 bg-card px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="button" size="sm" variant="secondary" loading={resending} onClick={onResend} className="shrink-0">
              Resend
            </Button>
          </div>
        </div>
      )}

      {needsInviteResend && (
        <div
          role="alert"
          className="mb-5 space-y-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning"
        >
          <div className="flex items-start gap-2.5">
            <MailQuestion size={17} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="The email your account was added with"
              dir="ltr"
              className="h-9 min-w-0 flex-1 rounded-md border border-warning/30 bg-card px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="button" size="sm" variant="secondary" loading={resendingInvite} onClick={onResendInvite} className="shrink-0">
              Resend
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Phone/email toggle — a visible tab pair rather than a single
            auto-detecting field, so the input control shown (PhoneInput's
            country picker vs. a plain email field) always matches what the
            person is about to type. */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => onToggleMode('phone')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
              loginMode === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <PhoneIcon size={14} /> Phone
          </button>
          <button
            type="button"
            onClick={() => onToggleMode('email')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
              loginMode === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Mail size={14} /> Email
          </button>
        </div>

        {loginMode === 'phone' ? (
          // Same country-aware PhoneInput used at registration, so what's
          // typed here normalizes to E.164 the same way the stored number
          // does (see comment on loginSchema above).
          <div>
            <Label htmlFor="phone">Phone number</Label>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <PhoneInput
                  id="phone"
                  international
                  labels={en}
                  defaultCountry="PK"
                  countryCallingCodeEditable={false}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? '')}
                  placeholder="300 1234567"
                  autoComplete="tel"
                  autoFocus
                  className={cn((errors as any).phone && 'PhoneInput-danger')}
                />
              )}
            />
            {(errors as any).phone && <p className="mt-1.5 text-xs text-danger">{(errors as any).phone.message}</p>}
          </div>
        ) : (
          <div>
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                {...register('email' as any)}
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                aria-invalid={!!(errors as any).email}
                className={cn(
                  'h-11 w-full rounded-lg border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  (errors as any).email ? 'border-danger' : 'border-input'
                )}
              />
            </div>
            {(errors as any).email && <p className="mt-1.5 text-xs text-danger">{(errors as any).email.message}</p>}
          </div>
        )}

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="password" className="mb-0">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="password"
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={!!errors.password}
              onKeyUp={(e) => setCapsLockOn(e.getModifierState?.('CapsLock') ?? false)}
              onKeyDown={(e) => setCapsLockOn(e.getModifierState?.('CapsLock') ?? false)}
              onBlur={() => setCapsLockOn(false)}
              className={cn(
                'h-11 w-full rounded-lg border bg-card pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                errors.password ? 'border-danger' : 'border-input'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-danger">{errors.password.message}</p>
          )}
          {/* Genuinely useful, not decorative — a wrong-looking password is
              one of the most common silent login failures, and the browser
              gives no native signal for it since the field is masked. */}
          {capsLockOn && !errors.password && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-warning">
              <Lock size={11} aria-hidden /> Caps Lock is on
            </p>
          )}
        </div>

        <Button type="submit" loading={isLoading} className="mt-1 w-full group" size="lg">
          {isLoading ? 'Signing in…' : (
            <>
              Sign in <ArrowRight aria-hidden size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>

      {/* Honest, accurate trust line — matches what tenant.middleware.ts /
          auth.middleware.ts actually enforce (per-institution isolation),
          not a generic "bank-grade security" claim. */}
      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck aria-hidden size={13} /> Your data is encrypted and isolated to your institution
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Marksly?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Having trouble?{' '}
        <a href="mailto:support@marksly.pk" className="font-medium text-primary hover:underline">
          Contact support
        </a>
      </p>
    </div>
  );
}
