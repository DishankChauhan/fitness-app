export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return date.toLocaleDateString();
  }

  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Tomorrow';
  }

  if (diffDays < 7) {
    return `${diffDays} days`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }

  return date.toLocaleDateString();
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

export function isDateInPast(dateString: string): boolean {
  return new Date(dateString).getTime() < Date.now();
}

export function getDaysRemaining(dateString: string): number {
  const diffTime = new Date(dateString).getTime() - Date.now();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
} 