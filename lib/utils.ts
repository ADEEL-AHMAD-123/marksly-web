import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'PKR'): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = new Date(date);
  if (format === 'short') return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  if (format === 'long') return d.toLocaleDateString('en-PK', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "3m ago" / "2h ago" / "5d ago", falling back to a plain date once it's
 *  old enough that a relative phrase stops being more useful than the date
 *  itself. Used by the notification bell so a fresh item reads as "just
 *  now" rather than a full timestamp nobody needs to parse at a glance. */
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 45) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d, 'short');
}

export function getPaginationRange(page: number, totalPages: number, delta = 2): number[] {
  const range: number[] = [];
  for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
    range.push(i);
  }
  if (page - delta > 2) range.unshift(-1);
  if (page + delta < totalPages - 1) range.push(-1);
  range.unshift(1);
  if (totalPages > 1) range.push(totalPages);
  return [...new Set(range)];
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}...` : str;
}
