/**
 * Turns a raw email-provider (Resend) error string — stored verbatim in
 * EmailLog.error by email.service.ts's sendEmail() — into something an
 * admin without any technical background can actually act on. Resend's own
 * error text is written for a developer (e.g. "Invalid `to` field. Please
 * provide a valid email address.", "The gmial.com domain is not verified.",
 * raw HTTP/axios errors like "timeout of 15000ms exceeded") and was
 * previously shown to admins completely unfiltered.
 *
 * Matches on stable substrings from Resend's actual error responses (and
 * axios's own network-error messages) rather than parsing an error code,
 * since Resend doesn't return one — this is inherently a best-effort
 * mapping, with a safe generic fallback for anything unrecognized. The raw
 * string is still available to whoever needs it (e.g. via a tooltip) for
 * real troubleshooting; this function is only for the primary, everyone-
 * reads-this message.
 */
export function friendlyEmailError(raw?: string | null): string {
  if (!raw) return 'The email could not be delivered.';
  const lower = raw.toLowerCase();

  if (lower.includes('not configured') || lower.includes('resend_api_key')) {
    return 'Email sending isn’t set up correctly on this server yet — contact support.';
  }
  if (lower.includes('domain') && (lower.includes('not verified') || lower.includes('is not verified'))) {
    return 'The email address doesn’t look real — no mail server was found for that domain. Double-check it’s spelled correctly.';
  }
  if (lower.includes('invalid') && lower.includes('to') && lower.includes('field')) {
    return 'That email address isn’t valid — check it’s typed correctly and try again.';
  }
  if (lower.includes('invalid') && lower.includes('email')) {
    return 'That email address isn’t valid — check it’s typed correctly and try again.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many emails were sent recently — wait a few minutes and try again.';
  }
  if (lower.includes('unauthorized') || lower.includes('api key') || lower.includes('restricted')) {
    return 'There’s a problem with the email service’s setup — contact support.';
  }
  if (lower.includes('timeout') || lower.includes('econnaborted') || lower.includes('econnrefused') || lower.includes('enotfound')) {
    return 'The email service didn’t respond in time — try again in a moment.';
  }
  if (lower.includes('spam') || lower.includes('blocked') || lower.includes('bounce')) {
    return 'The recipient’s mail server rejected the message — the address may not exist, or it flagged the email as spam.';
  }

  return 'The email could not be delivered — try resending, or contact support if this keeps happening.';
}
