import { Icon } from '../icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { useNotificationStore } from '../../state/notification.js';

export function NotificationBell({ className = '' }: { className?: string }) {
  const { getUnreadCount, togglePanel } = useNotificationStore();
  const unreadCount = getUnreadCount();

  return (
    <button
      onClick={togglePanel}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      className={`relative p-2 text-text-tertiary hover:text-text-primary transition-colors bg-surface border-2 border-border rounded-xl hover:shadow-sm ${className}`}
    >
      <Icon name={uiIcons.bell} className="h-[22px] w-[22px] object-contain" alt="" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white -translate-y-1/4 translate-x-1/4 ring-2 ring-background" aria-hidden="true">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
