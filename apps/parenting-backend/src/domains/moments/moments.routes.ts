import type { FastifyInstance } from "fastify";
import {
  createMomentSchema,
  updateMomentSchema,
  presignSchema,
  createMediaSchema,
  createTagSchema,
  createCommentSchema,
  createReactionSchema,
  createAlbumSchema,
  updateAlbumSchema,
} from "./moments.schema.js";
import * as svc from "./moments.service.js";

const bearerSecurity = [{ bearerAuth: [] }];

const familyIdParam = {
  type: "object",
  properties: { familyId: { type: "string" } },
  required: ["familyId"],
};

const momentIdParam = {
  type: "object",
  properties: { familyId: { type: "string" }, momentId: { type: "string" } },
  required: ["familyId", "momentId"],
};

const albumIdParam = {
  type: "object",
  properties: { familyId: { type: "string" }, albumId: { type: "string" } },
  required: ["familyId", "albumId"],
};

export default async function momentsRoutes(app: FastifyInstance) {
  // POST /families/:familyId/moments/presign
  app.post("/families/:familyId/moments/presign", {
    schema: {
      tags: ["Moments"],
      summary: "Get a presigned S3 URL for media upload",
      security: bearerSecurity,
      params: familyIdParam,
      body: {
        type: "object",
        required: ["contentType", "contentLength"],
        properties: {
          contentType: { type: "string" },
          contentLength: { type: "number" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            key: { type: "string" },
            url: { type: "string", format: "uri" },
          },
        },
        400: { type: "object", properties: { message: { type: "string" } } },
        403: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId } = req.params as { familyId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const body = presignSchema.parse(req.body);

    try {
      const result = await svc.presignUpload(userId, familyId, body);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.badRequest(message || "Failed to create upload URL");
    }
  });

  // POST /families/:familyId/moments
  app.post("/families/:familyId/moments", {
    schema: {
      tags: ["Moments"],
      summary: "Create a new moment",
      security: bearerSecurity,
      params: familyIdParam,
      body: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: 200 },
          description: { type: "string", maxLength: 2000 },
          momentType: { type: "string", enum: ["milestone", "everyday", "celebration", "firsts"] },
          location: { type: "string", maxLength: 200 },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      response: {
        200: { type: "object", properties: { moment: {} } },
        403: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId } = req.params as { familyId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const body = createMomentSchema.parse(req.body);
    const moment = await svc.createMoment(userId, familyId, body);
    return reply.send({ moment });
  });

  // GET /families/:familyId/moments
  app.get("/families/:familyId/moments", {
    schema: {
      tags: ["Moments"],
      summary: "List moments for a family",
      security: bearerSecurity,
      params: familyIdParam,
      querystring: {
        type: "object",
        properties: {
          childId: { type: "string" },
          memberId: { type: "string" },
          momentType: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          search: { type: "string" },
          limit: { type: "string" },
          offset: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            moments: { type: "array", items: {} },
            total: { type: "number" },
            limit: { type: "number" },
            offset: { type: "number" },
          },
        },
        403: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId } = req.params as { familyId: string };
    const query = req.query as {
      childId?: string;
      memberId?: string;
      momentType?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const result = await svc.getMoments(familyId, {
      childId: query.childId,
      memberId: query.memberId,
      momentType: query.momentType,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });

    return reply.send(result);
  });

  // GET /families/:familyId/moments/:momentId
  app.get("/families/:familyId/moments/:momentId", {
    schema: {
      tags: ["Moments"],
      summary: "Get a moment by ID",
      security: bearerSecurity,
      params: momentIdParam,
      response: {
        200: { type: "object", properties: { moment: {} } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, momentId } = req.params as { familyId: string; momentId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const moment = await svc.getMoment(momentId, familyId);
    if (!moment) return reply.notFound("Moment not found");

    return reply.send({ moment });
  });

  // PUT /families/:familyId/moments/:momentId
  app.put("/families/:familyId/moments/:momentId", {
    schema: {
      tags: ["Moments"],
      summary: "Update a moment",
      security: bearerSecurity,
      params: momentIdParam,
      body: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", maxLength: 2000 },
          momentType: { type: "string", enum: ["milestone", "everyday", "celebration", "firsts"] },
          location: { type: "string", maxLength: 200 },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      response: {
        200: { type: "object", properties: { moment: {} } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, momentId } = req.params as { familyId: string; momentId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const body = updateMomentSchema.parse(req.body);
    const moment = await svc.updateMoment(userId, momentId, familyId, body);
    if (!moment) return reply.notFound("Moment not found");

    return reply.send({ moment });
  });

  // DELETE /families/:familyId/moments/:momentId
  app.delete("/families/:familyId/moments/:momentId", {
    schema: {
      tags: ["Moments"],
      summary: "Delete a moment",
      security: bearerSecurity,
      params: momentIdParam,
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, momentId } = req.params as { familyId: string; momentId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const ok = await svc.deleteMoment(userId, momentId, familyId);
    if (!ok) return reply.notFound("Moment not found or you don't have permission");

    return reply.send({ success: true });
  });

  // POST /families/:familyId/moments/:momentId/media
  app.post("/families/:familyId/moments/:momentId/media", {
    schema: {
      tags: ["Moments"],
      summary: "Add media to a moment",
      security: bearerSecurity,
      params: momentIdParam,
      body: {
        type: "object",
        required: ["s3Key", "mimeType"],
        properties: {
          s3Key: { type: "string" },
          mimeType: { type: "string" },
          fileName: { type: "string" },
          fileSize: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
          duration: { type: "number" },
          position: { type: "number", default: 0 },
        },
      },
      response: {
        200: { type: "object", properties: { media: {} } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, momentId } = req.params as { familyId: string; momentId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const body = createMediaSchema.parse(req.body);
    const media = await svc.addMedia(userId, momentId, familyId, body);
    if (!media) return reply.notFound("Moment not found or you don't have permission");

    return reply.send({ media });
  });

  // DELETE /families/:familyId/moments/:momentId/media/:mediaId
  app.delete("/families/:familyId/moments/:momentId/media/:mediaId", {
    schema: {
      tags: ["Moments"],
      summary: "Remove media from a moment",
      security: bearerSecurity,
      params: {
        type: "object",
        properties: {
          familyId: { type: "string" },
          momentId: { type: "string" },
          mediaId: { type: "string" },
        },
        required: ["familyId", "momentId", "mediaId"],
      },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, momentId, mediaId } = req.params as {
      familyId: string;
      momentId: string;
      mediaId: string;
    };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const ok = await svc.removeMedia(userId, momentId, familyId, mediaId);
    if (!ok) return reply.notFound("Media not found or you don't have permission");

    return reply.send({ success: true });
  });

  // POST /families/:familyId/moments/:momentId/comments
  app.post("/families/:familyId/moments/:momentId/comments", {
    schema: {
      tags: ["Moments"],
      summary: "Add a comment to a moment",
      security: bearerSecurity,
      params: momentIdParam,
      body: {
        type: "object",
        required: ["content"],
        properties: { content: { type: "string", minLength: 1, maxLength: 1000 } },
      },
      response: {
        200: { type: "object", properties: { comment: {} } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, momentId } = req.params as { familyId: string; momentId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const body = createCommentSchema.parse(req.body);
    const comment = await svc.addComment(userId, momentId, familyId, body);
    if (!comment) return reply.notFound("Moment not found");

    return reply.send({ comment });
  });

  // DELETE /families/:familyId/moments/:momentId/comments/:commentId
  app.delete("/families/:familyId/moments/:momentId/comments/:commentId", {
    schema: {
      tags: ["Moments"],
      summary: "Delete a comment from a moment",
      security: bearerSecurity,
      params: {
        type: "object",
        properties: {
          familyId: { type: "string" },
          momentId: { type: "string" },
          commentId: { type: "string" },
        },
        required: ["familyId", "momentId", "commentId"],
      },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, momentId, commentId } = req.params as {
      familyId: string;
      momentId: string;
      commentId: string;
    };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const ok = await svc.removeComment(userId, momentId, familyId, commentId);
    if (!ok) return reply.notFound("Comment not found or you don't have permission");

    return reply.send({ success: true });
  });

  // POST /families/:familyId/moments/:momentId/reactions
  app.post("/families/:familyId/moments/:momentId/reactions", {
    schema: {
      tags: ["Moments"],
      summary: "Add or update a reaction on a moment",
      security: bearerSecurity,
      params: momentIdParam,
      body: {
        type: "object",
        required: ["reaction"],
        properties: { reaction: { type: "string", minLength: 1, maxLength: 50 } },
      },
      response: {
        200: { type: "object", properties: { reaction: {} } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, momentId } = req.params as { familyId: string; momentId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const body = createReactionSchema.parse(req.body);
    const reaction = await svc.addReaction(userId, momentId, familyId, body);
    if (!reaction) return reply.notFound("Moment not found");

    return reply.send({ reaction });
  });

  // DELETE /families/:familyId/moments/:momentId/reactions/:reactionId
  app.delete("/families/:familyId/moments/:momentId/reactions/:reactionId", {
    schema: {
      tags: ["Moments"],
      summary: "Remove a reaction from a moment",
      security: bearerSecurity,
      params: {
        type: "object",
        properties: {
          familyId: { type: "string" },
          momentId: { type: "string" },
          reactionId: { type: "string" },
        },
        required: ["familyId", "momentId", "reactionId"],
      },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, momentId } = req.params as {
      familyId: string;
      momentId: string;
      reactionId: string;
    };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const ok = await svc.removeReaction(userId, momentId, familyId);
    if (!ok) return reply.notFound("Moment not found");

    return reply.send({ success: true });
  });

  // POST /families/:familyId/moments/:momentId/tags
  app.post("/families/:familyId/moments/:momentId/tags", {
    schema: {
      tags: ["Moments"],
      summary: "Add a tag to a moment",
      security: bearerSecurity,
      params: momentIdParam,
      body: {
        type: "object",
        required: ["tagType", "tagValue"],
        properties: {
          tagType: { type: "string", enum: ["child", "member", "location", "object", "custom"] },
          tagValue: { type: "string", minLength: 1, maxLength: 200 },
        },
      },
      response: {
        200: { type: "object", properties: { tag: {} } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, momentId } = req.params as { familyId: string; momentId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const body = createTagSchema.parse(req.body);
    const tag = await svc.addTag(momentId, familyId, body);
    if (!tag) return reply.notFound("Moment not found");

    return reply.send({ tag });
  });

  // DELETE /families/:familyId/moments/:momentId/tags/:tagId
  app.delete("/families/:familyId/moments/:momentId/tags/:tagId", {
    schema: {
      tags: ["Moments"],
      summary: "Remove a tag from a moment",
      security: bearerSecurity,
      params: {
        type: "object",
        properties: {
          familyId: { type: "string" },
          momentId: { type: "string" },
          tagId: { type: "string" },
        },
        required: ["familyId", "momentId", "tagId"],
      },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, momentId, tagId } = req.params as {
      familyId: string;
      momentId: string;
      tagId: string;
    };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const ok = await svc.removeTag(momentId, familyId, tagId);
    if (!ok) return reply.notFound("Tag not found");

    return reply.send({ success: true });
  });

  // POST /families/:familyId/albums
  app.post("/families/:familyId/albums", {
    schema: {
      tags: ["Moments"],
      summary: "Create an album",
      security: bearerSecurity,
      params: familyIdParam,
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", maxLength: 1000 },
          albumType: { type: "string", enum: ["manual", "date-based", "child"] },
          coverMediaId: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { album: {} } },
        403: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId } = req.params as { familyId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const body = createAlbumSchema.parse(req.body);
    const album = await svc.createAlbum(userId, familyId, body);
    return reply.send({ album });
  });

  // GET /families/:familyId/albums
  app.get("/families/:familyId/albums", {
    schema: {
      tags: ["Moments"],
      summary: "List albums for a family",
      security: bearerSecurity,
      params: familyIdParam,
      response: {
        200: { type: "object", properties: { albums: { type: "array", items: {} } } },
        403: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId } = req.params as { familyId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const albums = await svc.getAlbums(familyId);
    return reply.send({ albums });
  });

  // PUT /families/:familyId/albums/:albumId
  app.put("/families/:familyId/albums/:albumId", {
    schema: {
      tags: ["Moments"],
      summary: "Update an album",
      security: bearerSecurity,
      params: albumIdParam,
      body: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", maxLength: 1000 },
          coverMediaId: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { album: {} } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, albumId } = req.params as { familyId: string; albumId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const body = updateAlbumSchema.parse(req.body);
    const album = await svc.updateAlbum(userId, albumId, familyId, body);
    if (!album) return reply.notFound("Album not found or you don't have permission");

    return reply.send({ album });
  });

  // DELETE /families/:familyId/albums/:albumId
  app.delete("/families/:familyId/albums/:albumId", {
    schema: {
      tags: ["Moments"],
      summary: "Delete an album",
      security: bearerSecurity,
      params: albumIdParam,
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, albumId } = req.params as { familyId: string; albumId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const ok = await svc.deleteAlbum(userId, albumId, familyId);
    if (!ok) return reply.notFound("Album not found or you don't have permission");

    return reply.send({ success: true });
  });

  // POST /families/:familyId/albums/:albumId/moments
  app.post("/families/:familyId/albums/:albumId/moments", {
    schema: {
      tags: ["Moments"],
      summary: "Add a moment to an album",
      security: bearerSecurity,
      params: albumIdParam,
      body: {
        type: "object",
        required: ["momentId"],
        properties: { momentId: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { albumMoment: {} } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, albumId } = req.params as { familyId: string; albumId: string };
    const { momentId } = req.body as { momentId: string };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const albumMoment = await svc.addMomentToAlbum(albumId, momentId, familyId);
    if (!albumMoment) return reply.notFound("Album or moment not found");

    return reply.send({ albumMoment });
  });

  // DELETE /families/:familyId/albums/:albumId/moments/:momentId
  app.delete("/families/:familyId/albums/:albumId/moments/:momentId", {
    schema: {
      tags: ["Moments"],
      summary: "Remove a moment from an album",
      security: bearerSecurity,
      params: {
        type: "object",
        properties: {
          familyId: { type: "string" },
          albumId: { type: "string" },
          momentId: { type: "string" },
        },
        required: ["familyId", "albumId", "momentId"],
      },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" } } },
        403: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const userId = req.user.sub;
    const { familyId, albumId, momentId } = req.params as {
      familyId: string;
      albumId: string;
      momentId: string;
    };

    if (!(await svc.checkFamilyAccess(familyId, userId))) {
      return reply.forbidden("Not a member of this family");
    }

    const ok = await svc.removeMomentFromAlbum(albumId, momentId, familyId);
    if (!ok) return reply.notFound("Moment not found in album");

    return reply.send({ success: true });
  });
}
