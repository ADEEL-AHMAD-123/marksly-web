import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Cloudinary (or other) photo URL. When present and loads successfully, it's
   *  shown instead of the initials circle. Falls back to initials on load error
   *  or when no photo is provided. */
  photoUrl?: string | null;
  alt?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function Avatar({ initials, size = 'md', className, photoUrl, alt = '', ...props }: AvatarProps) {
  const [errored, setErrored] = React.useState(false);

  React.useEffect(() => {
    setErrored(false);
  }, [photoUrl]);

  if (photoUrl && !errored) {
    return (
      <div
        className={cn('shrink-0 overflow-hidden rounded-full bg-muted', sizes[size], className)}
        {...props}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-soft-foreground',
        sizes[size],
        className
      )}
      {...props}
    >
      {initials}
    </div>
  );
}
