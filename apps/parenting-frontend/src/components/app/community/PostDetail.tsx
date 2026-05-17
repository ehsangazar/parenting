import { useState, useEffect } from 'react';
import { Icon } from '../../icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';
import { villageApi } from '../../../lib/appApi.js';
import { getPublicAuthorName } from './userDisplay.js';
import { Avatar } from '../../ui/Avatar.js';
import { useAuth } from '../../../state/auth.js';

interface PostDetailProps {
  postId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export const PostDetail = ({ postId, onClose, onUpdate }: PostDetailProps) => {
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSendBlockedByEmpty = !comment.trim() && !isSubmitting;
  const isSendDisabled = !comment.trim() || isSubmitting;
  const comments = Array.isArray(post?.comments) ? post.comments : [];
  const postAuthorName = post?.author
    ? getPublicAuthorName(post.author)
    : post?.authorId === user?.id
      ? (user?.profile?.name || user?.email || 'You')
      : 'Community member';
  const postAvatarUrl = post?.author?.profile?.avatarUrl
    || (post?.authorId === user?.id ? user?.profile?.avatarUrl : undefined);

  const loadPost = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const [postData, commentsData] = await Promise.all([
        villageApi.getPost(postId),
        villageApi.getPostComments(postId),
      ]);
      const loadedPost = postData?.post ?? postData;
      setPost({
        ...(loadedPost ?? {}),
        comments: Array.isArray(commentsData?.comments) ? commentsData.comments : [],
      });
    } catch (err) {
      console.error('Failed to load post:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) loadPost();
  }, [postId]);

  const handleAddComment = async () => {
    if (!comment.trim() || !postId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await villageApi.addComment(postId, comment);
      setComment('');
      await loadPost();
      onUpdate();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async () => {
    if (!postId) return;
    try {
      await villageApi.addReaction(postId, 'like');
      await loadPost();
      onUpdate();
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  if (!postId) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${postId ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside
        className={`absolute inset-y-0 right-0 w-full max-w-[600px] border-l border-border-light bg-surface shadow-2xl transition-transform duration-500 ease-out ${postId ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-light p-6">
            <h3 className="flex items-center gap-2 text-xl font-display font-bold text-text-primary">
              <Icon name={uiIcons.messageSquareText} className="h-5 w-5 text-primary-500" alt="" />
              Post Conversation
            </h3>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-text-tertiary transition-all hover:bg-surface-light hover:text-text-primary"
            >
              <Icon name={uiIcons.close} className="h-5 w-5" alt="" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && !post ? (
              <div className="p-6 space-y-4">
                <div className="h-24 animate-shimmer rounded-2xl" />
                <div className="h-64 animate-shimmer rounded-2xl" />
              </div>
            ) : post && (
              <div className="divide-y divide-border-light/50">
                {/* Original Post */}
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-200">
                      <Avatar src={postAvatarUrl} name={postAuthorName} size="md" className="!border-0 h-full w-full" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-text-primary">{postAuthorName}</span>
                        <span className="text-[11px] text-text-tertiary">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="mt-2 text-lg font-bold text-text-primary">{post.title}</h4>
                      <p className="mt-3 text-[15px] leading-relaxed text-text-secondary whitespace-pre-wrap">{post.content}</p>
                      
                      <div className="mt-6 flex items-center gap-4">
                        <button 
                          onClick={handleLike}
                          className="flex items-center gap-2 rounded-xl bg-surface px-4 py-2 text-sm font-bold text-text-secondary transition-all hover:bg-brand-red/10 hover:text-brand-red"
                        >
                          <Icon
                            name={uiIcons.thumbsUp}
                            className={`h-4 w-4 ${post.reactions?.length > 0 ? 'opacity-100' : 'opacity-60'}`}
                            alt=""
                          />
                          {post.reactions?.length || 0} Likes
                        </button>
                        <div className="flex items-center gap-2 text-sm font-bold text-text-tertiary">
                          <Icon name={uiIcons.messageSquare} className="h-4 w-4" alt="" />
                          {comments.length} Comments
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="bg-surface-light/50 p-6">
                  <h5 className="mb-6 text-sm font-bold uppercase tracking-wider text-text-tertiary">Comments</h5>
                  <div className="space-y-6">
                    {comments.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="mx-auto h-12 w-12 rounded-full bg-surface flex items-center justify-center border border-dashed border-border-light">
                          <Icon name={uiIcons.messageSquare} className="h-6 w-6 text-text-tertiary" alt="" />
                        </div>
                        <p className="mt-3 text-sm text-text-secondary">No comments yet. Start the conversation!</p>
                      </div>
                    ) : (
                      comments.map((c: any) => {
                        const authorName = c.author
                          ? getPublicAuthorName(c.author)
                          : c.authorId === user?.id
                            ? (user?.profile?.name || user?.email || 'You')
                            : 'Community member';
                        const commentAvatarUrl = c.author?.profile?.avatarUrl
                          || (c.authorId === user?.id ? user?.profile?.avatarUrl : undefined);
                        return (
                          <div key={c.id} className="flex gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface border border-border-light shadow-sm">
                              <Avatar src={commentAvatarUrl} name={authorName} size="sm" className="!border-0 h-full w-full" />
                            </div>
                            <div className="flex-1">
                              <div className="rounded-2xl rounded-tl-none bg-surface p-4 shadow-sm border border-border-light/50">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-text-primary">{authorName}</span>
                                  <span className="text-[10px] text-text-tertiary">{new Date(c.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-text-secondary leading-relaxed">{c.content}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Comment Input */}
          <div className="border-t border-border-light p-6 bg-surface">
            <div className="relative">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full min-h-[100px] rounded-2xl border border-border-light bg-background px-4 py-3 pb-12 text-sm text-text-primary focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-400/10 transition-all resize-none"
              />
              <div className="absolute bottom-3 right-3">
                <button
                  onClick={handleAddComment}
                  disabled={isSendDisabled}
                  className={`flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold shadow-lg transition-all ${
                    isSendBlockedByEmpty
                      ? 'cursor-not-allowed bg-border-dark text-text-secondary'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-primary/35 border-t-text-primary" />
                  ) : (
                    <>
                      <Icon
                        name={uiIcons.send}
                        className={`h-4 w-4 ${isSendBlockedByEmpty ? 'opacity-50' : 'brightness-0 invert'}`}
                        alt=""
                      />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
