// Deterministic subject → color mapping, shared across any screen that
// lists periods/subjects (Timetable's weekly grid, Attendance's period
// picker and roster) so the same subject reads as the same color
// everywhere in the app rather than each screen inventing its own palette.
// Keyed by subjectId when available, falling back to the subject name for
// legacy periods with no subjectId — hashed rather than assigned in
// insertion order so the same key always lands on the same color across
// reloads without persisting a color choice anywhere.
//
// Written as a fixed array of complete literal class names (not a
// template string built from the hashed index) because Tailwind only
// generates the utility classes it can find as complete strings in the
// source.
const SUBJECT_PALETTE = [
  { bg: 'bg-chart-1/10', border: 'border-chart-1/40', text: 'text-chart-1', dot: 'bg-chart-1' },
  { bg: 'bg-chart-2/10', border: 'border-chart-2/40', text: 'text-chart-2', dot: 'bg-chart-2' },
  { bg: 'bg-chart-3/10', border: 'border-chart-3/40', text: 'text-chart-3', dot: 'bg-chart-3' },
  { bg: 'bg-chart-4/10', border: 'border-chart-4/40', text: 'text-chart-4', dot: 'bg-chart-4' },
  { bg: 'bg-chart-5/10', border: 'border-chart-5/40', text: 'text-chart-5', dot: 'bg-chart-5' },
];

export function subjectColorClasses(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length];
}
