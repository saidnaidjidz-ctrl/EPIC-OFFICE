import NotificationCenter from '@/components/notifications/NotificationCenter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'View and manage Epic Club notifications.',
};

export default function NotificationsPage() {
  return <NotificationCenter />;
}
