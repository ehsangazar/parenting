import type { FastifyInstance } from "fastify";
import {
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  updateCommentSchema,
  createReactionSchema,
  createCategorySchema,
  updateCategorySchema,
  reportSchema,
  listPostsQuerySchema,
  listNotificationsQuerySchema,
} from "./community.schema.js";
import * as svc from "./community.service.js";

const bearerSecurity = [{ bearerAuth: [] }];

export default async function communityRoutes(app: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // Posts
  // ---------------------------------------------------------------------------

  app.post("/village/posts", {
    schema: {
      tags: ["Community"],
      summary: "Create a village post",
      security: bearerSecurity,
      body: {
        type: "object",
        required: ["title", "content"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          content: { type: "string", minLength: 1, maxLength: 10000 },
          postType: { type: "string", enum: ["question", "discussion", "advice", "announcement", "event"] },
          visibility: { type: "string", enum: ["public", "family_only"] },
          categoryId: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" } },
          isDraft: { type: "boolean" },
        },
      },
      response: {
        200: { type: "object", properties: { post: {} } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const body = createPostSchema.parse(req.body);
    const post = await svc.createPost(req.user.sub, body);
    return reply.send({ post });
  });

  app.get("/village/posts", {
    schema: {
      tags: ["Community"],
      summary: "List village posts",
      security: bearerSecurity,
      querystring: {
        type: "object",
        properties: {
          categoryId: { type: "string" },
          authorId: { type: "string" },
          postType: { type: "string" },
          visibility: { type: "string" },
          tags: { type: "string" },
          search: { type: "string" },
          sortBy: { type: "string" },
          limit: { type: "string" },
          offset: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            posts: { type: "array", items: {} },
            total: { type: "number" },
            limit: { type: "number" },
            offset: { type: "number" },
          },
        },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const query = listPostsQuerySchema.parse(req.query);
    const result = await svc.listPosts(req.user.sub, query);
    return reply.send(result);
  });

  app.get("/village/posts/:id", {
    schema: {
      tags: ["Community"],
      summary: "Get a village post",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { post: {} } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const post = await svc.getPost(id, req.user.sub);
    if (!post) return reply.notFound("Post not found or you don't have access");
    return reply.send({ post });
  });

  app.put("/village/posts/:id", {
    schema: {
      tags: ["Community"],
      summary: "Update a village post",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      body: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          content: { type: "string", minLength: 1, maxLength: 10000 },
          postType: { type: "string", enum: ["question", "discussion", "advice", "announcement", "event"] },
          visibility: { type: "string", enum: ["public", "family_only"] },
          categoryId: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" } },
          isDraft: { type: "boolean" },
        },
      },
      response: {
        200: { type: "object", properties: { post: {} } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = updatePostSchema.parse(req.body);
    const post = await svc.updatePost(id, req.user.sub, body);
    if (!post) return reply.notFound("Post not found or you don't have permission");
    return reply.send({ post });
  });

  app.delete("/village/posts/:id", {
    schema: {
      tags: ["Community"],
      summary: "Delete a village post",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await svc.deletePost(id, req.user.sub);
    if (!result) return reply.notFound("Post not found or you don't have permission");
    return reply.send({ success: true });
  });

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  app.get("/village/posts/:id/comments", {
    schema: {
      tags: ["Community"],
      summary: "List comments for a post",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { comments: { type: "array", items: {} } } },
        401: { description: "Unauthorized", type: "object" },
        403: { description: "Forbidden", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const comments = await svc.listComments(id, req.user.sub);
    if (!comments) return reply.forbidden("You don't have access to this post");
    return reply.send({ comments });
  });

  app.post("/village/posts/:postId/comments", {
    schema: {
      tags: ["Community"],
      summary: "Add a comment to a post",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["postId"],
        properties: { postId: { type: "string" } },
      },
      body: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string", minLength: 1, maxLength: 5000 },
          parentCommentId: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { comment: {} } },
        400: { description: "Post is locked", type: "object" },
        401: { description: "Unauthorized", type: "object" },
        403: { description: "Forbidden", type: "object" },
        404: { description: "Post not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { postId } = req.params as { postId: string };
    const body = createCommentSchema.parse(req.body);
    const result = await svc.createComment(postId, req.user.sub, body);

    if ("error" in result) {
      if (result.error === "forbidden") return reply.forbidden("You don't have access to this post");
      if (result.error === "not_found") return reply.notFound("Post not found");
      if (result.error === "locked") return reply.badRequest("This post is locked");
    }

    return reply.send({ comment: result.comment });
  });

  app.put("/village/comments/:commentId", {
    schema: {
      tags: ["Community"],
      summary: "Update a comment",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["commentId"],
        properties: { commentId: { type: "string" } },
      },
      body: {
        type: "object",
        properties: {
          content: { type: "string", minLength: 1, maxLength: 5000 },
        },
      },
      response: {
        200: { type: "object", properties: { comment: {} } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { commentId } = req.params as { commentId: string };
    const body = updateCommentSchema.parse(req.body);
    const comment = await svc.updateComment(commentId, req.user.sub, body);
    if (!comment) return reply.notFound("Comment not found or you don't have permission");
    return reply.send({ comment });
  });

  app.delete("/village/comments/:commentId", {
    schema: {
      tags: ["Community"],
      summary: "Delete a comment",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["commentId"],
        properties: { commentId: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { commentId } = req.params as { commentId: string };
    const result = await svc.deleteComment(commentId, req.user.sub);
    if (!result) return reply.notFound("Comment not found or you don't have permission");
    return reply.send({ success: true });
  });

  // ---------------------------------------------------------------------------
  // Reactions
  // ---------------------------------------------------------------------------

  app.post("/village/posts/:postId/reactions", {
    schema: {
      tags: ["Community"],
      summary: "React to a post",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["postId"],
        properties: { postId: { type: "string" } },
      },
      body: {
        type: "object",
        properties: {
          reactionType: { type: "string", enum: ["like", "helpful", "love", "laugh", "wow"] },
        },
      },
      response: {
        200: { type: "object", properties: { reaction: {} } },
        401: { description: "Unauthorized", type: "object" },
        403: { description: "Forbidden", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { postId } = req.params as { postId: string };
    const body = createReactionSchema.parse(req.body);
    const result = await svc.reactToPost(postId, req.user.sub, body);
    if (!result) return reply.forbidden("You don't have access to this post");
    return reply.send({ reaction: result.reaction });
  });

  app.delete("/village/reactions/:reactionId", {
    schema: {
      tags: ["Community"],
      summary: "Remove a post reaction",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["reactionId"],
        properties: { reactionId: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    // reactionId here is used as postId per route spec (delete reaction by post context)
    const { reactionId } = req.params as { reactionId: string };
    await svc.deletePostReaction(reactionId, req.user.sub);
    return reply.send({ success: true });
  });

  app.post("/village/comments/:commentId/reactions", {
    schema: {
      tags: ["Community"],
      summary: "React to a comment",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["commentId"],
        properties: { commentId: { type: "string" } },
      },
      body: {
        type: "object",
        properties: {
          reactionType: { type: "string", enum: ["like", "helpful", "love", "laugh", "wow"] },
        },
      },
      response: {
        200: { type: "object", properties: { reaction: {} } },
        401: { description: "Unauthorized", type: "object" },
        403: { description: "Forbidden", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { commentId } = req.params as { commentId: string };
    const body = createReactionSchema.parse(req.body);
    const result = await svc.reactToComment(commentId, req.user.sub, body);

    if ("error" in result) {
      if (result.error === "not_found") return reply.notFound("Comment not found");
      if (result.error === "forbidden") return reply.forbidden("You don't have access to this comment");
    }

    return reply.send({ reaction: result.reaction });
  });

  // ---------------------------------------------------------------------------
  // Bookmarks
  // ---------------------------------------------------------------------------

  app.post("/village/posts/:postId/bookmarks", {
    schema: {
      tags: ["Community"],
      summary: "Bookmark a post",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["postId"],
        properties: { postId: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { bookmark: {} } },
        401: { description: "Unauthorized", type: "object" },
        403: { description: "Forbidden", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { postId } = req.params as { postId: string };
    const bookmark = await svc.bookmarkPost(req.user.sub, postId);
    if (!bookmark) return reply.forbidden("You don't have access to this post");
    return reply.send({ bookmark });
  });

  app.delete("/village/bookmarks/:bookmarkId", {
    schema: {
      tags: ["Community"],
      summary: "Remove a bookmark",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["bookmarkId"],
        properties: { bookmarkId: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    // bookmarkId is used as postId per route spec
    const { bookmarkId } = req.params as { bookmarkId: string };
    await svc.deleteBookmark(req.user.sub, bookmarkId);
    return reply.send({ success: true });
  });

  // ---------------------------------------------------------------------------
  // Follows
  // ---------------------------------------------------------------------------

  app.post("/village/follow/:userId", {
    schema: {
      tags: ["Community"],
      summary: "Follow a user",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["userId"],
        properties: { userId: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { follow: {} } },
        400: { description: "Cannot follow yourself", type: "object" },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { userId: followingId } = req.params as { userId: string };
    const result = await svc.followUser(req.user.sub, followingId);

    if ("error" in result) {
      if (result.error === "self_follow") return reply.badRequest("Cannot follow yourself");
    }

    return reply.send({ follow: result.follow });
  });

  app.delete("/village/following/:userId", {
    schema: {
      tags: ["Community"],
      summary: "Unfollow a user",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["userId"],
        properties: { userId: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { userId: followingId } = req.params as { userId: string };
    await svc.unfollowUser(req.user.sub, followingId);
    return reply.send({ success: true });
  });

  app.get("/village/followers", {
    schema: {
      tags: ["Community"],
      summary: "Get followers of the authenticated user",
      security: bearerSecurity,
      response: {
        200: { type: "object", properties: { followers: { type: "array", items: {} } } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const followers = await svc.getFollowers(req.user.sub);
    return reply.send({ followers });
  });

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  app.get("/village/categories", {
    schema: {
      tags: ["Community"],
      summary: "List categories",
      response: {
        200: { type: "object", properties: { categories: { type: "array", items: {} } } },
      },
    },
  }, async (_req, reply) => {
    const categories = await svc.listCategories();
    return reply.send({ categories });
  });

  app.post("/village/categories", {
    schema: {
      tags: ["Community"],
      summary: "Create a category (admin only)",
      security: bearerSecurity,
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          description: { type: "string", maxLength: 500 },
          color: { type: "string" },
          icon: { type: "string" },
          order: { type: "number" },
        },
      },
      response: {
        200: { type: "object", properties: { category: {} } },
        401: { description: "Unauthorized", type: "object" },
        403: { description: "Forbidden", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const body = createCategorySchema.parse(req.body);
    const result = await svc.createCategory(req.user.sub, body);

    if ("error" in result) {
      if (result.error === "forbidden") return reply.forbidden("Only administrators can create categories");
    }

    return reply.send({ category: result.category });
  });

  app.put("/village/categories/:id", {
    schema: {
      tags: ["Community"],
      summary: "Update a category (admin only)",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      body: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          description: { type: "string", maxLength: 500 },
          color: { type: "string" },
          icon: { type: "string" },
          order: { type: "number" },
        },
      },
      response: {
        200: { type: "object", properties: { category: {} } },
        401: { description: "Unauthorized", type: "object" },
        403: { description: "Forbidden", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = updateCategorySchema.parse(req.body);
    const result = await svc.updateCategory(req.user.sub, id, body);

    if ("error" in result) {
      if (result.error === "forbidden") return reply.forbidden("Only administrators can update categories");
    }

    return reply.send({ category: result.category });
  });

  app.delete("/village/categories/:id", {
    schema: {
      tags: ["Community"],
      summary: "Delete a category (admin only)",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        401: { description: "Unauthorized", type: "object" },
        403: { description: "Forbidden", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await svc.deleteCategory(req.user.sub, id);

    if ("error" in result) {
      if (result.error === "forbidden") return reply.forbidden("Only administrators can delete categories");
    }

    return reply.send({ success: true });
  });

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------

  app.post("/village/posts/:postId/reports", {
    schema: {
      tags: ["Community"],
      summary: "Report a post",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["postId"],
        properties: { postId: { type: "string" } },
      },
      body: {
        type: "object",
        required: ["reason"],
        properties: {
          reason: { type: "string", minLength: 1, maxLength: 500 },
        },
      },
      response: {
        200: { type: "object", properties: { report: {} } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { postId } = req.params as { postId: string };
    const { reason } = reportSchema.parse(req.body);
    const report = await svc.reportPost(req.user.sub, postId, reason);
    return reply.send({ report });
  });

  app.post("/village/comments/:commentId/reports", {
    schema: {
      tags: ["Community"],
      summary: "Report a comment",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["commentId"],
        properties: { commentId: { type: "string" } },
      },
      body: {
        type: "object",
        required: ["reason"],
        properties: {
          reason: { type: "string", minLength: 1, maxLength: 500 },
        },
      },
      response: {
        200: { type: "object", properties: { report: {} } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { commentId } = req.params as { commentId: string };
    const { reason } = reportSchema.parse(req.body);
    const report = await svc.reportComment(req.user.sub, commentId, reason);
    return reply.send({ report });
  });

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  app.get("/village/notifications", {
    schema: {
      tags: ["Community"],
      summary: "List notifications for the authenticated user",
      security: bearerSecurity,
      querystring: {
        type: "object",
        properties: {
          unreadOnly: { type: "string" },
          limit: { type: "string" },
          offset: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            notifications: { type: "array", items: {} },
            total: { type: "number" },
            unreadCount: { type: "number" },
            limit: { type: "number" },
            offset: { type: "number" },
          },
        },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const query = listNotificationsQuerySchema.parse(req.query);
    const result = await svc.listNotifications(req.user.sub, query);
    return reply.send(result);
  });

  app.put("/village/notifications/:notificationId", {
    schema: {
      tags: ["Community"],
      summary: "Mark a notification as read",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["notificationId"],
        properties: { notificationId: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { notification: {} } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { notificationId } = req.params as { notificationId: string };
    const notification = await svc.markNotificationRead(notificationId, req.user.sub);
    if (!notification) return reply.notFound("Notification not found");
    return reply.send({ notification });
  });
}
