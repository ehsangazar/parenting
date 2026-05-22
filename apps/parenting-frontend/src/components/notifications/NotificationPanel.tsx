import { useNotificationStore, NotificationType } from '../../state/notification.js';
import { formatDistanceToNow } from 'date-fns';

import { uiIcons } from '../../lib/iconSemantics.js';
import type { AnyIconName } from '../icons/index.js';
import { Icon } from '../icons/index.js';

const typeIcons: Record<NotificationType, AnyIconName> = {
  info: uiIcons.info,
  success: uiIcons.checkOk,
  warning: uiIcons.alertTriangle,
  error: uiIcons.alertCircle,
  alert: uiIcons.alertCircle,
};

const typeColors: Record<NotificationType, string> = {
  info: 'text-info bg-info/15 border-border',
  success: 'text-success bg-primary-50 border-primary-200',
  warning: 'text-warning bg-secondary-50 border-secondary-100',
  error: 'text-error bg-error/10 border-error/30',
  alert: 'text-brand-purple bg-brand-purple/15 border-border',
};

export function NotificationPanel() {
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll, isPanelOpen, setPanelOpen } = useNotificationStore();

  if (!isPanelOpen) return null;

  const onClose = () => setPanelOpen(false);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute inset-y-0 right-0 w-full max-w-md border-l-2 border-border bg-surface shadow-2xl flex flex-col transform transition-transform duration-300">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-text-primary">Notifications</h2>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-2 text-text-tertiary hover:text-brand-blue transition-colors"
                title="Mark all as read"
              >
                <Icon name={uiIcons.check} className="w-5 h-5 flex-shrink-0 object-contain" alt="" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <Icon name={uiIcons.close} className="w-5 h-5 object-contain" alt="" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-background/50">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-text-tertiary px-6 text-center">
              <div className="w-16 h-16 bg-surface-light rounded-full flex items-center justify-center mb-4">
                <Icon name={uiIcons.bell} className="w-8 h-8 opacity-40 flex-shrink-0 object-contain" alt="" />
              </div>
              <p className="font-medium text-text-secondary">All caught up!</p>
              <p className="text-sm mt-1">You don&apos;t have any notifications at the moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const iconName = typeIcons[notification.type];
                return (
                  <div
                    key={notification.id}
                    className={`p-4 transition-all duration-200 hover:bg-surface-light group relative ${
                      !notification.read ? 'bg-brand-blue/10' : 'bg-transparent'
                    }`}
                  >
                    {!notification.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-blue" />
                    )}
                    <div className="flex gap-4">
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${typeColors[notification.type]}`}>
                        <Icon name={iconName} className="w-5 h-5 flex-shrink-0 object-contain" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`text-sm font-semibold truncate ${!notification.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                            {notification.title}
                          </h3>
                          <span className="text-[10px] text-text-tertiary whitespace-nowrap mt-0.5">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        {notification.message && (
                          <p className="text-sm text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                            {notification.message}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs font-medium text-brand-blue hover:text-[#3BA8D8] transition-colors"
                            >
                              Mark as read
                            </button>
                          )}
                          {notification.link && (
                            <a
                              href={notification.link}
                              className="text-xs font-medium text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
                            >
                              View details <Icon name={uiIcons.externalLink} className="w-3 h-3 object-contain inline" alt="" />
                            </a>
                          )}
                          <button
                            onClick={() => removeNotification(notification.id)}
                            className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-text-tertiary hover:text-error transition-all rounded"
                          >
                            <Icon name={uiIcons.trash} className="w-4 h-4 object-contain" alt="" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-4 border-t border-border bg-surface sticky bottom-0">
            <button
              onClick={clearAll}
              className="w-full py-2.5 px-4 bg-surface-light text-text-secondary text-sm font-medium rounded-xl hover:bg-surface-warm transition-colors flex items-center justify-center gap-2"
            >
              <Icon name={uiIcons.trash} className="w-4 h-4 object-contain" alt="" />
              Clear all notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
