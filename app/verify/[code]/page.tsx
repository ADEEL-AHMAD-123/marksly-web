import type { Metadata } from 'next';
import { VerifyResultView } from '@/components/verify/VerifyResultView';

// This is a per-student, sensitive-adjacent page reached only via a QR code
// on a physical ID card — it must never be indexed or show up in search.
// robots.ts also lists /verify in its disallow rules; this page-level export
// is a second, belt-and-braces layer for crawlers that ignore robots.txt.
export const metadata: Metadata = {
  title: 'ID Verification · Marksly',
  robots: { index: false, follow: false, nocache: true },
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Mirrors backend id-verification.service.ts's VerifyResult exactly — the
// discriminator is `type`, present only when `valid` is true (an invalid
// result never reveals whether it would have been a student or staff card).
export type VerifyResult =
  | { valid: false; reason?: string }
  | {
      valid: true;
      type: 'student';
      studentName: string;
      institutionName: string;
      institutionLogoUrl: string | null;
      className: string | null;
      sectionName: string | null;
      status: string;
    }
  | {
      valid: true;
      type: 'staff';
      personName: string;
      institutionName: string;
      institutionLogoUrl: string | null;
      role: string;
      department: string | null;
      status: 'active' | 'inactive';
    };

async function fetchVerification(code: string): Promise<VerifyResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/verify/${encodeURIComponent(code)}`, {
      // Never cache a verification result — status can change (e.g. a
      // student withdraws) and this must always reflect the current truth.
      cache: 'no-store',
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.data) {
      return { valid: false, reason: 'not_found' };
    }
    return body.data as VerifyResult;
  } catch {
    return { valid: false, reason: 'network_error' };
  }
}

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await fetchVerification(code);

  return <VerifyResultView result={result} />;
}
