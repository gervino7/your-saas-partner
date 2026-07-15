import { startOfWeek } from 'date-fns';

export function formatHours(hours: number | null | undefined): string {
  const h = Number(hours) || 0;
  if (h === 0) return '0h';
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (mins === 0) return `${whole}h`;
  return `${whole}h${mins.toString().padStart(2, '0')}`;
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
