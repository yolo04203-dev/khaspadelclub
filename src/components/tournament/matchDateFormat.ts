export function formatMatchDateTime(scheduledAt: string | null | undefined): string {
  if (!scheduledAt) return "";
  const d = new Date(scheduledAt);
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + 
    " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
