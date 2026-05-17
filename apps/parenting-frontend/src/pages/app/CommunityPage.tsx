import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { villageApi } from '../../lib/appApi.js';
import { PageHeader } from '../../components/app/PageHeader.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { PostCard } from '../../components/app/community/PostCard.js';
import { PostComposer } from '../../components/app/community/PostComposer.js';
import { PostDetail } from '../../components/app/community/PostDetail.js';
import { CommunitySidebar } from '../../components/app/community/CommunitySidebar.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';

const filters = ['All', 'Discussion', 'Question', 'Advice', 'Announcement', 'Event'];

export const CommunityPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const selectedPostId = searchParams.get('post');

  const handleOpenPost = (postId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('post', postId);
    setSearchParams(nextParams);
  };

  const handleClosePost = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('post');
    setSearchParams(nextParams);
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await villageApi.listPosts({ limit: 50, offset: 0 });
      setPosts(data.posts ?? []);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPosts(); }, []);

  const handleCreatePost = async (data: any) => {
    await villageApi.createPost(data);
    await loadPosts();
    setIsComposerOpen(false);
  };

  const handleLike = async (postId: string) => {
    try {
      await villageApi.addReaction(postId, 'like');
      await loadPosts();
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const filteredPosts = activeFilter === 'All'
    ? posts
    : posts.filter((p) => p.postType?.toLowerCase() === activeFilter.toLowerCase());

  const stats = {
    totalPosts: posts.length,
    activeMembers: new Set(posts.map(p => p.authorId)).size || 0,
    totalLikes: posts.reduce((acc, p) => acc + (p.reactions?.length || 0), 0)
  };

  return (
    <PageContainer verticalSpacing="normal" contentSpacing="none">
      <PageHeader
        title={t('page.villageTitle')}
        subtitle={t('page.communitySubtitle')}
        iconName={appAssetIcons.village}
        className="!mb-1"
      >
        <button
          onClick={() => setIsComposerOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-primary-500/20 transition-all hover:scale-[1.02] hover:bg-primary-700 active:scale-[0.98] sm:px-5 sm:py-2.5 sm:text-sm"
        >
          <Icon name={uiIcons.plus} className="h-4 w-4 sm:h-5 sm:w-5" alt="" /> {t('page.villageShare')}
        </button>
      </PageHeader>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pt-1 pb-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          
          {/* Main Feed */}
          <main className="flex-1 min-w-0">
            {/* Filters & View Controls */}
            <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="w-full min-w-0 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                <div className="flex w-max min-w-full items-center gap-2 pr-2">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border-light bg-surface text-text-tertiary">
                    <Icon name={uiIcons.filter} className="h-4 w-4" alt="" />
                  </div>
                  {filters.map((f) => (
                    <button 
                      key={f} 
                      onClick={() => setActiveFilter(f)}
                      className={`flex-shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        activeFilter === f 
                          ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20 translate-y-[-1px]' 
                          : 'border border-border-light bg-surface text-text-secondary hover:border-primary-300 hover:text-primary-400'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden items-center gap-1 rounded-xl border border-border-light bg-surface p-1 sm:flex">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`rounded-lg p-1.5 transition-all ${viewMode === 'grid' ? 'bg-primary-50 text-primary-700' : 'text-text-tertiary hover:text-text-secondary'}`}
                >
                  <Icon name={uiIcons.grid} className="h-4 w-4" alt="" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-lg p-1.5 transition-all ${viewMode === 'list' ? 'bg-primary-50 text-primary-700' : 'text-text-tertiary hover:text-text-secondary'}`}
                >
                  <Icon name={uiIcons.list} className="h-4 w-4" alt="" />
                </button>
              </div>
            </div>

            {/* Posts Grid/List */}
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {loading && posts.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 animate-shimmer rounded-3xl border border-border-light bg-surface" />
                ))
              ) : filteredPosts.length === 0 ? (
                <div className="col-span-full mt-12 flex flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-border-light bg-surface p-16 text-center shadow-sm">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-primary-500">
                    <Icon name={uiIcons.sprout} className="h-10 w-10" alt="" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-text-primary">Plant the first seed</h3>
                  <p className="mt-2 max-w-xs text-text-secondary">
                    This topic is currently quiet. Be the first to share an update, ask a question, or give some advice!
                  </p>
                  <button 
                    onClick={() => setIsComposerOpen(true)}
                    className="mt-8 rounded-2xl bg-primary-600 px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-700 active:scale-95"
                  >
                    Start a Conversation
                  </button>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onClick={() => handleOpenPost(post.id)}
                    onLike={() => handleLike(post.id)}
                  />
                ))
              )}
            </div>
          </main>

          {/* Sidebar */}
          <CommunitySidebar stats={stats} />
        </div>
      </div>

      <PostComposer 
        isOpen={isComposerOpen} 
        onClose={() => setIsComposerOpen(false)} 
        onSubmit={handleCreatePost}
      />

      <PostDetail 
        postId={selectedPostId} 
        onClose={handleClosePost}
        onUpdate={loadPosts}
      />
    </PageContainer>
  );
};
