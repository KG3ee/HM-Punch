import { apiFetch } from '@/lib/api';
import { UserRole } from '@/types/auth';

export type UserNotification = {
  id: string;
  type: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  title: string;
  body: string;
  link: string | null;
  payloadJson?: unknown;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  items: UserNotification[];
  nextCursor: string | null;
};

const DEFAULT_PUSH_ROLES = ['ADMIN', 'LEADER', 'DRIVER', 'MEMBER', 'CHEF', 'MAID'];

function isPushEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_PUSH_ENABLED;
  return raw === '1' || raw === 'true';
}

function allowedPushRoles(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_PUSH_ROLES?.trim();
  if (!raw) {
    return new Set(DEFAULT_PUSH_ROLES);
  }
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean),
  );
}

export function shouldEnablePushForRole(role?: UserRole | null): boolean {
  if (!isPushEnabled()) return false;
  if (!role) return false;
  return allowedPushRoles().has(role.toUpperCase());
}

export async function fetchNotifications(limit = 20, unreadOnly = false): Promise<NotificationListResponse> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (unreadOnly) {
    query.set('unreadOnly', 'true');
  }
  return apiFetch<NotificationListResponse>(`/notifications?${query.toString()}`);
}

export async function fetchNotificationUnreadCount(): Promise<number> {
  const result = await apiFetch<{ unread: number }>('/notifications/unread-count');
  return result.unread;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch('/notifications/read-all', { method: 'POST' });
}

export async function ensurePushSubscription(role?: UserRole | null): Promise<void> {
  if (!shouldEnablePushForRole(role)) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return;

  let permission = window.Notification?.permission || 'default';
  if (permission === 'default') {
    permission = await window.Notification.requestPermission();
  }
  if (permission !== 'granted') return;

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

  await apiFetch('/notifications/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      userAgent: navigator.userAgent,
      deviceLabel: navigator.platform || 'browser',
    }),
  });
}

export async function unsubscribePushSubscription(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  try {
    await apiFetch('/notifications/subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } finally {
    await subscription.unsubscribe();
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
