import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/index.js";
import type {
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput,
  UpdateCommentInput,
  CreateReactionInput,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./community.schema.js";

// ---------------------------------------------------------------------------
// Access control helpers
// ---------------------------------------------------------------------------

export async function canAccessPost(
  postId: string,
  userId: string,
): Promise<{ canAccess: boolean; post: unknown }> {
  const post = await prisma.villagePost.findUnique({
    where: { id: postId },
    include: {
      author: {
        include: {
          familyMembers: {
            include: {
              family: {
                include: {
                  members: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!post) return { canAccess: false, post: null };

  if (post.visibility === "public") {
    return { canAccess: true, post };
  }

  if (post.visibility === "family_only") {
    const authorFamilyIds = post.author.familyMembers.map((fm) => fm.familyId);
    const userFamilies = await prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true },
    });
    const userFamilyIds = userFamilies.map((fm) => fm.familyId);
    const sharedFamilies = authorFamilyIds.filter((id) =>
      userFamilyIds.includes(id),
    );
    return { canAccess: sharedFamilies.length > 0, post };
  }

  return { canAccess: false, post };
}

export function buildPostQuery(
  userId: string,
  filters: Prisma.VillagePostWhereInput = {},
): Prisma.VillagePostWhereInput {
  return {
    OR: [
      { visibility: "public" },
      {
        AND: [
          { visibility: "family_only" },
          {
            author: {
              familyMembers: {
                some: {
                  family: {
                    members: {
                      some: { userId },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    ],
    ...filters,
  };
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function createPost(userId: string, data: CreatePostInput) {
  return prisma.villagePost.create({
    data: {
      authorId: userId,
      title: data.title,
      content: data.content,
      postType: data.postType,
      visibility: data.visibility,
      categoryId: data.categoryId ?? null,
      tags: data.tags ?? [],
      isDraft: data.isDraft,
    },
    include: {
      author: {
        select: { id: true, email: true, profile: true },
      },
      category: true,
    },
  });
}

export async function updatePost(
  postId: string,
  userId: string,
  data: UpdatePostInput,
) {
  const current = await prisma.villagePost.findFirst({
    where: { id: postId, authorId: userId },
  });
  if (!current) return null;

  return prisma.villagePost.update({
    where: { id: postId },
    data: {
      ...data,
      editedAt: data.title || data.content ? new Date() : current.editedAt,
    },
    include: {
      author: {
        select: { id: true, email: true, profile: true },
      },
      category: true,
    },
  });
}

export async function deletePost(postId: string, userId: string) {
  const post = await prisma.villagePost.findFirst({
    where: { id: postId, authorId: userId },
  });
  if (!post) return null;

  await prisma.villagePost.delete({ where: { id: postId } });
  return post;
}

export async function findPost(postId: string) {
  return prisma.villagePost.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: { id: true, email: true, profile: true },
      },
      category: true,
      reactions: {
        include: {
          user: {
            select: { id: true, email: true, profile: true },
          },
        },
      },
      _count: {
        select: { comments: true, bookmarks: true },
      },
    },
  });
}

export async function findManyPosts(
  where: Prisma.VillagePostWhereInput,
  orderBy:
    | Prisma.VillagePostOrderByWithRelationInput
    | Prisma.VillagePostOrderByWithRelationInput[],
  userId: string,
  take: number,
  skip: number,
) {
  return Promise.all([
    prisma.villagePost.findMany({
      where,
      include: {
        author: {
          select: { id: true, email: true, profile: true },
        },
        category: true,
        reactions: {
          where: { userId },
          take: 1,
        },
        _count: {
          select: { comments: true, reactions: true },
        },
      },
      orderBy,
      take,
      skip,
    }),
    prisma.villagePost.count({ where }),
  ]);
}

export async function incrementViewCount(postId: string) {
  return prisma.villagePost
    .update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function createComment(
  postId: string,
  userId: string,
  data: CreateCommentInput,
) {
  const comment = await prisma.villageComment.create({
    data: {
      postId,
      authorId: userId,
      content: data.content,
      parentCommentId: data.parentCommentId ?? null,
    },
    include: {
      author: {
        select: { id: true, email: true, profile: true },
      },
      parentComment: {
        include: {
          author: {
            select: { id: true, email: true, profile: true },
          },
        },
      },
    },
  });

  await prisma.villagePost.update({
    where: { id: postId },
    data: { commentCount: { increment: 1 } },
  });

  return comment;
}

export async function updateComment(
  commentId: string,
  userId: string,
  data: UpdateCommentInput,
) {
  const current = await prisma.villageComment.findFirst({
    where: { id: commentId, authorId: userId },
  });
  if (!current) return null;

  return prisma.villageComment.update({
    where: { id: commentId },
    data: {
      ...data,
      editedAt: data.content ? new Date() : current.editedAt,
    },
    include: {
      author: {
        select: { id: true, email: true, profile: true },
      },
    },
  });
}

export async function deleteComment(commentId: string, userId: string) {
  const comment = await prisma.villageComment.findFirst({
    where: { id: commentId, authorId: userId },
  });
  if (!comment) return null;

  await prisma.villageComment.delete({ where: { id: commentId } });

  await prisma.villagePost.update({
    where: { id: comment.postId },
    data: { commentCount: { decrement: 1 } },
  });

  return comment;
}

export async function findManyComments(postId: string, userId: string) {
  return prisma.villageComment.findMany({
    where: { postId, parentCommentId: null },
    include: {
      author: {
        select: { id: true, email: true, profile: true },
      },
      replies: {
        include: {
          author: {
            select: { id: true, email: true, profile: true },
          },
          replies: {
            include: {
              author: {
                select: { id: true, email: true, profile: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      reactions: {
        where: { userId },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

export async function upsertPostReaction(
  postId: string,
  userId: string,
  data: CreateReactionInput,
) {
  const existing = await prisma.villageReaction.findFirst({
    where: { postId, userId },
  });

  let reaction;
  if (existing) {
    reaction = await prisma.villageReaction.update({
      where: { id: existing.id },
      data: { reactionType: data.reactionType },
      include: { user: { select: { id: true, email: true } } },
    });
  } else {
    reaction = await prisma.villageReaction.create({
      data: { postId, userId, reactionType: data.reactionType },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  const count = await prisma.villageReaction.count({ where: { postId } });
  await prisma.villagePost.update({
    where: { id: postId },
    data: { reactionCount: count },
  });

  return { reaction, isNew: !existing };
}

export async function deletePostReaction(postId: string, userId: string) {
  await prisma.villageReaction.deleteMany({ where: { postId, userId } });

  const count = await prisma.villageReaction.count({ where: { postId } });
  await prisma.villagePost.update({
    where: { id: postId },
    data: { reactionCount: count },
  });
}

export async function upsertCommentReaction(
  commentId: string,
  userId: string,
  data: CreateReactionInput,
) {
  const existing = await prisma.villageReaction.findFirst({
    where: { commentId, userId },
  });

  let reaction;
  if (existing) {
    reaction = await prisma.villageReaction.update({
      where: { id: existing.id },
      data: { reactionType: data.reactionType },
      include: { user: { select: { id: true, email: true } } },
    });
  } else {
    reaction = await prisma.villageReaction.create({
      data: { commentId, userId, reactionType: data.reactionType },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  const count = await prisma.villageReaction.count({ where: { commentId } });
  await prisma.villageComment.update({
    where: { id: commentId },
    data: { reactionCount: count },
  });

  return reaction;
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

export async function createBookmark(userId: string, postId: string) {
  const existing = await prisma.villageBookmark.findFirst({
    where: { userId, postId },
  });
  if (existing) return existing;

  return prisma.villageBookmark.create({ data: { userId, postId } });
}

export async function deleteBookmark(userId: string, postId: string) {
  return prisma.villageBookmark.deleteMany({ where: { userId, postId } });
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export async function createFollow(followerId: string, followingId: string) {
  const existing = await prisma.villageFollow.findFirst({
    where: { followerId, followingId },
  });
  if (existing) return { follow: existing, isNew: false };

  const follow = await prisma.villageFollow.create({
    data: { followerId, followingId },
  });
  return { follow, isNew: true };
}

export async function deleteFollow(followerId: string, followingId: string) {
  return prisma.villageFollow.deleteMany({ where: { followerId, followingId } });
}

export async function findFollowers(userId: string) {
  return prisma.villageFollow.findMany({
    where: { followingId: userId },
    include: {
      follower: {
        select: { id: true, email: true, profile: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function createReport(
  reporterId: string,
  reason: string,
  target: { postId: string } | { commentId: string },
) {
  return prisma.villageReport.create({
    data: { reporterId, reason, ...target },
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function createNotification(data: {
  userId: string;
  type: string;
  relatedPostId?: string;
  relatedCommentId?: string;
  relatedUserId?: string;
}) {
  return prisma.villageNotification.create({ data });
}

export async function findManyNotifications(
  userId: string,
  unreadOnly: boolean,
  take: number,
  skip: number,
) {
  const where: Prisma.VillageNotificationWhereInput = { userId };
  if (unreadOnly) where.read = false;

  return Promise.all([
    prisma.villageNotification.findMany({
      where,
      include: {
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.villageNotification.count({ where }),
    prisma.villageNotification.count({ where: { userId, read: false } }),
  ]);
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
) {
  const existing = await prisma.villageNotification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!existing) return null;

  return prisma.villageNotification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(data: CreateCategoryInput) {
  return prisma.villageCategory.create({ data });
}

export async function updateCategory(
  categoryId: string,
  data: UpdateCategoryInput,
) {
  return prisma.villageCategory.update({ where: { id: categoryId }, data });
}

export async function deleteCategory(categoryId: string) {
  return prisma.villageCategory.delete({ where: { id: categoryId } });
}

export async function findManyCategories() {
  return prisma.villageCategory.findMany({ orderBy: { order: "asc" } });
}

// ---------------------------------------------------------------------------
// Helpers used by service
// ---------------------------------------------------------------------------

export async function findPostForLockCheck(postId: string) {
  return prisma.villagePost.findUnique({ where: { id: postId } });
}

export async function findCommentWithPost(commentId: string) {
  return prisma.villageComment.findUnique({
    where: { id: commentId },
    include: { post: true },
  });
}

export async function findCommentById(commentId: string) {
  return prisma.villageComment.findUnique({ where: { id: commentId } });
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}
