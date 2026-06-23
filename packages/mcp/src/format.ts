export function toJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function toError(
  message: string,
  recovery?: string,
): { content: { type: 'text'; text: string }[]; isError: true } {
  const text = recovery ? `${message}\n\n${recovery}` : message;
  return { content: [{ type: 'text', text }], isError: true };
}

export function notFound(kind: string, slug: string) {
  return toError(`${kind} "${slug}" not found.`);
}

export function truncateList<T>(items: T[], max = 20): { items: T[]; total: number; note?: string } {
  if (items.length <= max) return { items, total: items.length };
  return { items: items.slice(0, max), total: items.length, note: `Showing ${max} of ${items.length}` };
}
