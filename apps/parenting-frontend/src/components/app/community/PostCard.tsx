import { Icon, type IconName } from '../../icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';
import { getPublicAuthorName } from './userDisplay.js';
import { Avatar } from '../../ui/Avatar.js';

export type PostType = 'discussion' | 'question' | 'advice' | 'announcement' | 'event';

export const postTypeConfig: Record<PostType, { iconName: IconName; color: string }> = {
  discussion: { iconName: uiIcons.messageSquare, color: 'bg-primary-100 text-primary-fg' },
  question: { iconName: uiIcons.help, color: 'bg-blue-100 text-blue-700' },
  advice: { iconName: uiIcons.lightbulb, color: 'bg-secondary-100 text-secondary-700' },
  announcement: { iconName: uiIcons.megaphone, color: 'bg-orange-100 text-orange-700' },
  event: { iconName: uiIcons.partyPopper, color: 'bg-pink-100 text-pink-700' },
};

interface PostCardProps {
  post: any;
  onClick?: () => void;
  onLike?: (e: React.MouseEvent) => void;
}

export const PostCard = ({ post, onClick, onLike }: PostCardProps) => {
  const cfg = postTypeConfig[post.postType as PostType] ?? postTypeConfig.discussion;
  const authorName = getPublicAuthorName(post.author);
  const avatarUrl = post.author?.profile?.avatarUrl;
  const liked = post.reactions?.length > 0;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border border-border-light bg-surface p-4 transition-all hover:border-primary-300 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {/* Author Avatar */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-200 shadow-sm transition-transform group-hover:scale-110">
          <Avatar src={avatarUrl} name={authorName} size="md" className="!border-0 h-full w-full" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-text-primary">{post.title}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-tertiary">
                <span className="font-medium">{authorName}</span>
                <span>•</span>
                <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
            <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
              <Icon name={cfg.iconName} className="h-3 w-3" alt="" />
              {post.postType}
            </span>
          </div>

          {/* Content */}
          <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-text-secondary">{post.content}</p>

          {/* Footer Actions */}
          <div className="mt-4 flex items-center gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLike?.(e);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-red-50 ${
                liked ? 'text-red-600' : 'text-text-tertiary hover:text-red-600'
              }`}
            >
              <Icon name={uiIcons.heart} className={`h-4 w-4 ${liked ? 'opacity-100' : 'opacity-70'}`} alt="" />
              <span>{post.reactions?.length || 0}</span>
            </button>

            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-text-tertiary">
              <Icon name={uiIcons.messageSquare} className="h-4 w-4" alt="" />
              <span>{post.comments?.length || 0}</span>
            </div>

            <div className="ml-auto flex items-center gap-1 rounded-md border border-border-light/50 bg-surface-light/50 px-2 py-0.5 text-[10px] font-bold text-text-tertiary">
              {post.visibility === 'public' ? (
                <>
                  <Icon name={uiIcons.globe} className="h-3 w-3" alt="" /> PUBLIC
                </>
              ) : (
                <>
                  <Icon name={uiIcons.lock} className="h-3 w-3" alt="" /> PRIVATE
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
