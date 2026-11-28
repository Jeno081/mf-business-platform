import { API_URL } from './api';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  url: string | null;
  publishedAt: string;
}

export async function fetchAnnouncements(limit = 20): Promise<Announcement[]> {
  const response = await fetch(`${API_URL}/api/v1/announcements?limit=${limit}`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Annonces indisponibles.');
  const payload = (await response.json()) as { data?: Announcement[] };
  return payload.data ?? [];
}
