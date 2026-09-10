import type { MyOnlineExamItem } from '@/store/api/examAttemptApi';

export type OnlineExamNudgeStatus = 'in_progress' | 'live' | 'upcoming' | 'missed' | 'done';

/** Classifies an online exam's current state from the student-facing
 *  MyOnlineExamItem shape — shared by the student dashboard nudge and the
 *  parent-facing exam widgets/page so "live"/"upcoming"/"missed" always
 *  mean exactly the same thing everywhere a student or their guardian sees
 *  it. Never trust `windowStart`/`windowEnd` alone without also checking
 *  `hasInProgressAttempt`/`canEnter` — an exam with no configured window at
 *  all is always treated as open. */
export function classifyOnlineExam(e: MyOnlineExamItem): OnlineExamNudgeStatus {
  if (e.hasInProgressAttempt) return 'in_progress';
  const now = Date.now();
  const windowOpen = (!e.windowStart || now >= new Date(e.windowStart).getTime()) && (!e.windowEnd || now <= new Date(e.windowEnd).getTime());
  if (windowOpen && e.canEnter) return 'live';
  if (e.windowStart && now < new Date(e.windowStart).getTime()) return 'upcoming';
  if (e.windowEnd && now > new Date(e.windowEnd).getTime()) return e.attemptsUsed > 0 ? 'done' : 'missed';
  return 'done';
}
