import { useState } from 'react';
import { Icon, type IconName } from '../../icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';
import { type PostType, postTypeConfig } from './PostCard.js';

interface PostComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; postType: PostType; visibility: string }) => void;
}

export const PostComposer = ({ isOpen, onClose, onSubmit }: PostComposerProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('discussion');
  const [visibility, setVisibility] = useState('public');

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    onSubmit({ title, content, postType, visibility });
    setTitle('');
    setContent('');
    setPostType('discussion');
    setVisibility('public');
  };

  const visibilityOptions: { value: string; iconName: IconName; label: string }[] = [
    { value: 'public', iconName: uiIcons.globe, label: 'Public' },
    { value: 'family_only', iconName: uiIcons.lock, label: 'Family only' },
  ];

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside
        className={`absolute inset-y-0 right-0 w-full max-w-[500px] border-l border-border-light bg-surface shadow-2xl transition-transform duration-500 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border-light p-6">
            <div>
              <h3 className="font-display text-xl font-bold text-text-primary">Share with the village</h3>
              <p className="text-sm text-text-tertiary">Post updates, ask questions, or share advice.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-text-tertiary transition-all hover:bg-surface-light hover:text-text-primary"
            >
              <Icon name={uiIcons.close} className="h-5 w-5" alt="" />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Title Input */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-tertiary">Topic Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-sm font-medium transition-all focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-400/10"
              />
            </div>

            {/* Content Input */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-tertiary">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts, questions, or experiences…"
                className="min-h-[160px] w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-sm transition-all focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-400/10"
                rows={6}
              />
            </div>

            {/* Post Type Selector */}
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-text-tertiary">Topic Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(postTypeConfig) as PostType[]).map((value) => {
                  const cfg = postTypeConfig[value];
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPostType(value)}
                      className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-bold transition-all ${
                        postType === value
                          ? `${cfg.color} border-current ring-2 ring-current/20 ring-offset-1`
                          : 'border-border-light bg-surface-light text-text-secondary hover:border-primary-200 hover:bg-surface'
                      }`}
                    >
                      <Icon name={cfg.iconName} className="h-4 w-4 shrink-0" alt="" />
                      <span className="capitalize">{value}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility Selector */}
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-text-tertiary">Who can see this?</label>
              <div className="flex gap-2">
                {visibilityOptions.map(({ value, iconName, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setVisibility(value)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
                      visibility === value
                        ? 'border-primary-500 bg-primary-50 text-primary-fg shadow-sm'
                        : 'border-border-light text-text-secondary hover:border-primary-200 hover:bg-surface-light'
                    }`}
                  >
                    <Icon name={iconName} className="h-4 w-4 shrink-0" alt="" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border-light p-6">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-primary-500/25 disabled:cursor-not-allowed disabled:bg-border-dark disabled:text-text-secondary disabled:opacity-100"
            >
              <Icon name={uiIcons.messageCircle} className="h-5 w-5 shrink-0" alt="" />
              Post to Community
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
