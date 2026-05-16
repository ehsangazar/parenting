import { recordAudit } from "../../shared/audit/index.js";
import { awardCoins } from "../../shared/gamification/index.js";
import { POINTS } from "../../config/points.js";
import * as repo from "./community.repository.js";
import type {
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput,
  UpdateCommentInput,
  CreateReactionInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  ListPostsQuery,
  ListNotificationsQuery,
} from "./community.schema.js";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function createPost(userId: string, data: CreatePostInput) {
  const post = await repo.createPost(userId, data);

  await recordAudit({
    userId,
    action: "create",
    resourceType: "village_post",
    resourceId: post.id,
  });

  try {
    await awardCoins(userId, POINTS.COINS_VILLAGE_POST);
  } catch {
    // gamification failure is non-fatal
  }

  return post;
}

export async function listPosts(userId: string, query: ListPostsQuery) {
  const where: Prisma.VillagePostWhereInput = repo.buildPostQuery(userId);

  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.authorId) where.authorId = query.authorId;
  if (query.postType) where.postType = query.postType;
  if (query.visibility) where.visibility = query.visibility;

  if (query.tags) {
    const tagArray = query.tags.split(",");
    where.tags = {
      path: ["$"],
      array_contains: tagArray,
    } as Prisma.JsonNullableFilter;
  }

  if (query.search) {
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR : []),
      { title: { contains: query.search, mode: "insensitive" } },
      { content: { contains: query.search, mode: "insensitive" } },
    ];
  }

  where.isDraft = false;

  const sortBy = query.sortBy ?? "newest";
  let orderBy:
    | Prisma.VillagePostOrderByWithRelationInput
    | Prisma.VillagePostOrderByWithRelationInput[] = { createdAt: "desc" };

  if (sortBy === "most_active") {
    orderBy = { commentCount: "desc" };
  } else if (sortBy === "most_liked") {
    orderBy = { reactionCount: "desc" };
  } else if (sortBy === "trending") {
    orderBy = [
      { isPinned: "desc" },
      { reactionCount: "desc" },
      { createdAt: "desc" },
    ];
  }

  const take = query.limit ? parseInt(query.limit, 10) : 20;
  const skip = query.offset ? parseInt(query.offset, 10) : 0;

  const [posts, total] = await repo.findManyPosts(where, orderBy, userId, take, skip);

  // Increment view counts in the background
  for (const post of posts) {
    repo.incrementViewCount(post.id);
  }

  return { posts, total, limit: take, offset: skip };
}

export async function getPost(postId: string, userId: string) {
  const { canAccess } = await repo.canAccessPost(postId, userId);
  if (!canAccess) return null;

  const post = await repo.findPost(postId);
  if (post) await repo.incrementViewCount(postId);
  return post;
}

export async function updatePost(
  postId: string,
  userId: string,
  data: UpdatePostInput,
) {
  const post = await repo.updatePost(postId, userId, data);
  if (!post) return null;

  await recordAudit({
    userId,
    action: "update",
    resourceType: "village_post",
    resourceId: postId,
  });

  return post;
}

export async function deletePost(postId: string, userId: string) {
  const post = await repo.deletePost(postId, userId);
  if (!post) return null;

  await recordAudit({
    userId,
    action: "delete",
    resourceType: "village_post",
    resourceId: postId,
  });

  return post;
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function createComment(
  postId: string,
  userId: string,
  data: CreateCommentInput,
) {
  const { canAccess } = await repo.canAccessPost(postId, userId);
  if (!canAccess) return { error: "forbidden" as const };

  const post = await repo.findPostForLockCheck(postId);
  if (!post) return { error: "not_found" as const };
  if (post.isLocked) return { error: "locked" as const };

  const comment = await repo.createComment(postId, userId, data);

  try {
    await awardCoins(userId, POINTS.COINS_VILLAGE_COMMENT);
  } catch {
    // gamification failure is non-fatal
  }

  // Notify post author (if not the commenter)
  if (post.authorId !== userId) {
    await repo.createNotification({
      userId: post.authorId,
      type: "post_comment",
      relatedPostId: postId,
      relatedCommentId: comment.id,
      relatedUserId: userId,
    });
  }

  // Notify parent comment author (if replying)
  if (data.parentCommentId) {
    const parent = await repo.findCommentById(data.parentCommentId);
    if (parent && parent.authorId !== userId) {
      await repo.createNotification({
        userId: parent.authorId,
        type: "reply",
        relatedPostId: postId,
        relatedCommentId: comment.id,
        relatedUserId: userId,
      });
    }
  }

  return { comment };
}

export async function listComments(postId: string, userId: string) {
  const { canAccess } = await repo.canAccessPost(postId, userId);
  if (!canAccess) return null;

  return repo.findManyComments(postId, userId);
}

export async function updateComment(
  commentId: string,
  userId: string,
  data: UpdateCommentInput,
) {
  return repo.updateComment(commentId, userId, data);
}

export async function deleteComment(commentId: string, userId: string) {
  return repo.deleteComment(commentId, userId);
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

export async function reactToPost(
  postId: string,
  userId: string,
  data: CreateReactionInput,
) {
  const { canAccess } = await repo.canAccessPost(postId, userId);
  if (!canAccess) return null;

  return repo.upsertPostReaction(postId, userId, data);
}

export async function deletePostReaction(postId: string, userId: string) {
  return repo.deletePostReaction(postId, userId);
}

export async function reactToComment(
  commentId: string,
  userId: string,
  data: CreateReactionInput,
) {
  const commentWithPost = await repo.findCommentWithPost(commentId);
  if (!commentWithPost) return { error: "not_found" as const };

  const { canAccess } = await repo.canAccessPost(
    commentWithPost.postId,
    userId,
  );
  if (!canAccess) return { error: "forbidden" as const };

  const reaction = await repo.upsertCommentReaction(commentId, userId, data);
  return { reaction };
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

export async function bookmarkPost(userId: string, postId: string) {
  const { canAccess } = await repo.canAccessPost(postId, userId);
  if (!canAccess) return null;

  return repo.createBookmark(userId, postId);
}

export async function deleteBookmark(userId: string, postId: string) {
  return repo.deleteBookmark(userId, postId);
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) return { error: "self_follow" as const };

  const { follow, isNew } = await repo.createFollow(followerId, followingId);

  if (isNew) {
    await repo.createNotification({
      userId: followingId,
      type: "follow",
      relatedUserId: followerId,
    });
  }

  return { follow };
}

export async function unfollowUser(followerId: string, followingId: string) {
  return repo.deleteFollow(followerId, followingId);
}

export async function getFollowers(userId: string) {
  return repo.findFollowers(userId);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function reportPost(
  userId: string,
  postId: string,
  reason: string,
) {
  const report = await repo.createReport(userId, reason, { postId });

  await recordAudit({
    userId,
    action: "report",
    resourceType: "village_post",
    resourceId: postId,
  });

  return report;
}

export async function reportComment(
  userId: string,
  commentId: string,
  reason: string,
) {
  const report = await repo.createReport(userId, reason, { commentId });

  await recordAudit({
    userId,
    action: "report",
    resourceType: "village_comment",
    resourceId: commentId,
  });

  return report;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listNotifications(
  userId: string,
  query: ListNotificationsQuery,
) {
  const unreadOnly = query.unreadOnly === "true";
  const take = query.limit ? parseInt(query.limit, 10) : 50;
  const skip = query.offset ? parseInt(query.offset, 10) : 0;

  const [notifications, total, unreadCount] = await repo.findManyNotifications(
    userId,
    unreadOnly,
    take,
    skip,
  );

  return { notifications, total, unreadCount, limit: take, offset: skip };
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
) {
  return repo.markNotificationRead(notificationId, userId);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategories() {
  return repo.findManyCategories();
}

export async function createCategory(
  userId: string,
  data: CreateCategoryInput,
) {
  const user = await repo.findUserById(userId);
  if (user?.role !== "admin") return { error: "forbidden" as const };

  const category = await repo.createCategory(data);

  await recordAudit({
    userId,
    action: "create",
    resourceType: "village_category",
    resourceId: category.id,
  });

  return { category };
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  data: UpdateCategoryInput,
) {
  const user = await repo.findUserById(userId);
  if (user?.role !== "admin") return { error: "forbidden" as const };

  const category = await repo.updateCategory(categoryId, data);

  await recordAudit({
    userId,
    action: "update",
    resourceType: "village_category",
    resourceId: categoryId,
  });

  return { category };
}

export async function deleteCategory(userId: string, categoryId: string) {
  const user = await repo.findUserById(userId);
  if (user?.role !== "admin") return { error: "forbidden" as const };

  await repo.deleteCategory(categoryId);

  await recordAudit({
    userId,
    action: "delete",
    resourceType: "village_category",
    resourceId: categoryId,
  });

  return { ok: true };
}
