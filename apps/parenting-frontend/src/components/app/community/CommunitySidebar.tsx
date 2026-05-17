import { Icon } from '../../icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';

interface CommunitySidebarProps {
  stats: {
    totalPosts: number;
    activeMembers: number;
    totalLikes: number;
  };
}

export const CommunitySidebar = ({ stats }: CommunitySidebarProps) => {
  return (
    <aside className="hidden w-80 flex-shrink-0 space-y-6 lg:block">
      {/* Community Stats */}
      <div className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-text-primary">
          <Icon name={uiIcons.trendingUp} className="h-5 w-5 text-primary-500" alt="" />
          Community Stats
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-border-light/50 bg-surface p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Icon name={uiIcons.messageSquare} className="h-4 w-4" alt="" />
              </div>
              <span className="text-sm font-medium text-text-secondary">Posts</span>
            </div>
            <span className="text-sm font-bold text-text-primary">{stats.totalPosts}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border-light/50 bg-surface p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <Icon name={uiIcons.users} className="h-4 w-4" alt="" />
              </div>
              <span className="text-sm font-medium text-text-secondary">Members</span>
            </div>
            <span className="text-sm font-bold text-text-primary">{stats.activeMembers}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border-light/50 bg-surface p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Icon name={uiIcons.heart} className="h-4 w-4" alt="" />
              </div>
              <span className="text-sm font-medium text-text-secondary">Likes</span>
            </div>
            <span className="text-sm font-bold text-text-primary">{stats.totalLikes}</span>
          </div>
        </div>
      </div>

      {/* Community Rules */}
      <div className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-text-primary">
          <Icon name={uiIcons.shieldCheck} className="h-5 w-5 text-secondary-500" alt="" />
          Village Rules
        </h3>
        <ul className="space-y-3">
          {['Be respectful and kind', 'Help others with advice', 'Share personal experiences', 'No spam or advertising'].map(
            (rule, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary-400" />
                {rule}
              </li>
            ),
          )}
        </ul>
      </div>

      {/* Support Banner */}
      <div className="rounded-[28px] border border-border-light bg-primary-50 p-6 shadow-sm">
        <h4 className="text-base font-bold text-text-primary">Need Help?</h4>
        <p className="mt-2 text-sm text-text-secondary">
          Can&apos;t find what you&apos;re looking for? Ask the community or check our resources.
        </p>
      </div>
    </aside>
  );
};
