import { Badge } from '@/components/ui/badge';
import type { EmailDeliveryStatus } from '@/store/api/usersApi';

interface Props {
  emailVerified: boolean;
  emailDeliveryStatus: EmailDeliveryStatus;
  emailDeliveryError: string | null;
}

/**
 * Replaces the old plain "Active/Inactive" badge for the manageable staff
 * roles (teacher/staff/accountant), which now go through an invite-link
 * flow instead of an immediately-usable temp password (see user.service.ts's
 * create()) — `isActive` alone no longer tells the whole story, since an
 * account can be `isActive: true` and still completely unable to log in
 * because nobody has clicked the activation link yet.
 */
export function InviteStatusBadge({ emailVerified, emailDeliveryStatus, emailDeliveryError }: Props) {
  if (emailVerified) {
    return <Badge variant="success">Active</Badge>;
  }

  if (emailDeliveryStatus === 'bounced' || emailDeliveryStatus === 'failed') {
    return (
      <span className="inline-flex flex-col gap-0.5">
        <Badge variant="danger">Invite failed</Badge>
        {emailDeliveryError && (
          <span className="max-w-[220px] text-[11px] leading-snug text-muted-foreground">{emailDeliveryError}</span>
        )}
      </span>
    );
  }

  if (emailDeliveryStatus === 'delivered') {
    return <Badge variant="warning">Invited (delivered)</Badge>;
  }

  return <Badge variant="warning">Invited</Badge>;
}
