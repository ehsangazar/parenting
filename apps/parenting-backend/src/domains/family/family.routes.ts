import type { FastifyInstance } from "fastify";
import {
  createFamilySchema,
  updateFamilySchema,
  addMemberSchema,
  inviteMemberSchema,
  updateMemberSchema,
  addChildSchema,
  updateChildSchema,
  createEventSchema,
  updateEventSchema,
} from "./family.schema.js";
import * as svc from "./family.service.js";
import { buildIcsCalendar, type IcsEventInput } from "./ics.js";
import { parseCalendarEvent } from "./calendar-parser.js";

const ICS_FEED_KIND = "calendar-ics-feed";
const ICS_FEED_EXPIRY = "3650d";

const bearerSecurity = [{ bearerAuth: [] }];

export default async function familyRoutes(app: FastifyInstance) {
  // POST /families
  app.post("/families", {
    schema: {
      tags: ["Family"],
      summary: "Create a new family",
      security: bearerSecurity,
      body: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string", minLength: 1, maxLength: 100 } },
      },
      response: {
        200: { type: "object", properties: { family: { type: "object" } } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const body = createFamilySchema.parse(req.body);
    const family = await svc.createFamily(req.user.sub, body);
    return reply.send({ family });
  });

  // GET /families
  app.get("/families", {
    schema: {
      tags: ["Family"],
      summary: "List families the authenticated user belongs to",
      security: bearerSecurity,
      response: {
        200: { type: "object", properties: { families: { type: "array" } } },
        401: { description: "Unauthorized", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req) => {
    const families = await svc.listFamiliesForUser(req.user.sub);
    return { families };
  });

  // GET /families/:id
  app.get("/families/:id", {
    schema: {
      tags: ["Family"],
      summary: "Get a family by ID",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { family: { type: "object" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Family not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const family = await svc.getFamilyById(id, req.user.sub);
    if (!family) return reply.notFound("Family not found");
    return { family };
  });

  // PUT /families/:id
  app.put("/families/:id", {
    schema: {
      tags: ["Family"],
      summary: "Update a family (owner only)",
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
          modules: { type: "object" },
        },
      },
      response: {
        200: { type: "object", properties: { family: { type: "object" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Family not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = updateFamilySchema.parse(req.body);
    const updated = await svc.updateFamily(id, req.user.sub, body);
    if (!updated) return reply.notFound("Family not found or you don't have permission");
    return { family: updated };
  });

  // DELETE /families/:id
  app.delete("/families/:id", {
    schema: {
      tags: ["Family"],
      summary: "Delete a family (owner only)",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { ok: { type: "boolean" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Family not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = await svc.deleteFamily(id, req.user.sub);
    if (!ok) return reply.notFound("Family not found or you don't have permission");
    return reply.send({ ok: true });
  });

  // POST /families/:id/members
  app.post("/families/:id/members", {
    schema: {
      tags: ["Family"],
      summary: "Add an existing user to a family (or send invite if not found)",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      body: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
          name: { type: "string", maxLength: 100 },
          birthday: { type: "string" },
          role: { type: "string" },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = addMemberSchema.parse(req.body);
    const result = await svc.addMember(id, req.user.sub, body);

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return reply.notFound("Family not found or you don't have permission");
        case "already_invited":
          return reply.badRequest("Invite already sent to this email");
        case "already_member":
          return reply.badRequest("User is already a member of this family");
      }
    }

    if ("invited" in result) {
      return reply.send({
        invite: result.invite,
        message: "User does not exist. Invitation sent.",
      });
    }

    return reply.send({ member: result.member });
  });

  // POST /families/:id/invite
  app.post("/families/:id/invite", {
    schema: {
      tags: ["Family"],
      summary: "Send a family invite by email",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      body: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
          role: { type: "string" },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = inviteMemberSchema.parse(req.body);
    const result = await svc.inviteMember(id, req.user.sub, body);

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return reply.notFound("Family not found or you don't have permission");
        case "already_invited":
          return reply.badRequest("Invite already sent to this email");
        case "already_member":
          return reply.badRequest("User is already a member of this family");
      }
    }

    return reply.send({ invite: result.invite });
  });

  // GET /families/:id/members
  app.get("/families/:id/members", {
    schema: {
      tags: ["Family"],
      summary: "List members of a family",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { members: { type: "array" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Family not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const members = await svc.listMembers(id, req.user.sub);
    if (!members) return reply.notFound("Family not found");
    return { members };
  });

  // PUT /families/:id/members/:memberId
  app.put("/families/:id/members/:memberId", {
    schema: {
      tags: ["Family"],
      summary: "Update a family member",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id", "memberId"],
        properties: {
          id: { type: "string" },
          memberId: { type: "string" },
        },
      },
      body: {
        type: "object",
        properties: {
          name: { type: "string", maxLength: 100 },
          birthday: { type: "string" },
          role: { type: "string" },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id, memberId } = req.params as { id: string; memberId: string };
    const body = updateMemberSchema.parse(req.body);
    const result = await svc.updateMember(id, memberId, req.user.sub, body);

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return reply.notFound("Family not found");
        case "member_not_found":
          return reply.notFound("Member not found");
        case "forbidden":
          return reply.forbidden("You can only update your own member record");
        case "role_forbidden":
          return reply.forbidden("Only family owner can change member roles");
      }
    }

    return { member: result.member };
  });

  // DELETE /families/:id/members/:memberId
  app.delete("/families/:id/members/:memberId", {
    schema: {
      tags: ["Family"],
      summary: "Remove a member from a family (owner only)",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id", "memberId"],
        properties: {
          id: { type: "string" },
          memberId: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { ok: { type: "boolean" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id, memberId } = req.params as { id: string; memberId: string };
    const result = await svc.removeMember(id, memberId, req.user.sub);

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return reply.notFound("Family not found or you don't have permission");
        case "member_not_found":
          return reply.notFound("Member not found");
        case "cannot_remove_owner":
          return reply.badRequest("Cannot remove family owner");
      }
    }

    return reply.send({ ok: true });
  });

  // POST /families/:id/children
  app.post("/families/:id/children", {
    schema: {
      tags: ["Family"],
      summary: "Add a child to a family",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          birthday: { type: "string" },
          isUnborn: { type: "boolean" },
          dueDate: { type: "string" },
          pregnancyType: { type: "string" },
          modules: { type: "object" },
        },
      },
      response: {
        200: { type: "object", properties: { child: { type: "object" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Family not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = addChildSchema.parse(req.body);
    const child = await svc.addChild(id, req.user.sub, body);
    if (!child) return reply.notFound("Family not found or you don't have permission");
    return reply.send({ child });
  });

  // GET /families/:id/children
  app.get("/families/:id/children", {
    schema: {
      tags: ["Family"],
      summary: "List children of a family",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { children: { type: "array" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Family not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const children = await svc.listChildren(id, req.user.sub);
    if (!children) return reply.notFound("Family not found");
    return { children };
  });

  // PUT /families/:id/children/:childId
  app.put("/families/:id/children/:childId", {
    schema: {
      tags: ["Family"],
      summary: "Update a child",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id", "childId"],
        properties: {
          id: { type: "string" },
          childId: { type: "string" },
        },
      },
      body: {
        type: "object",
        properties: {
          name: { type: "string", maxLength: 100 },
          birthday: { type: "string" },
          isUnborn: { type: "boolean" },
          dueDate: { type: "string" },
          pregnancyType: { type: "string" },
          modules: { type: "object" },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id, childId } = req.params as { id: string; childId: string };
    const body = updateChildSchema.parse(req.body);
    const result = await svc.updateChild(id, childId, req.user.sub, body);

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return reply.notFound("Family not found or you don't have permission");
        case "child_not_found":
          return reply.notFound("Child not found");
      }
    }

    return { child: result.child };
  });

  // DELETE /families/:id/children/:childId
  app.delete("/families/:id/children/:childId", {
    schema: {
      tags: ["Family"],
      summary: "Delete a child",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id", "childId"],
        properties: {
          id: { type: "string" },
          childId: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { ok: { type: "boolean" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id, childId } = req.params as { id: string; childId: string };
    const result = await svc.deleteChild(id, childId, req.user.sub);

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return reply.notFound("Family not found or you don't have permission");
        case "child_not_found":
          return reply.notFound("Child not found");
      }
    }

    return reply.send({ ok: true });
  });

  // GET /families/:id/children/:childId/profile
  app.get("/families/:id/children/:childId/profile", {
    schema: {
      tags: ["Family"],
      summary: "Get an age-based profile for a child",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["id", "childId"],
        properties: {
          id: { type: "string" },
          childId: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            child: { type: "object" },
            age: { type: ["number", "null"] },
            profile: { type: "string" },
          },
        },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id, childId } = req.params as { id: string; childId: string };
    const result = await svc.getChildProfile(id, childId, req.user.sub);

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return reply.notFound("Family not found");
        case "child_not_found":
          return reply.notFound("Child not found");
      }
    }

    return result;
  });

  // POST /invites/:token/accept
  app.post("/invites/:token/accept", {
    schema: {
      tags: ["Family"],
      summary: "Accept a family invite by token",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["token"],
        properties: { token: { type: "string" } },
      },
      response: {
        200: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            family: { type: "object" },
          },
        },
        400: { description: "Invite invalid or already used", type: "object" },
        401: { description: "Unauthorized", type: "object" },
        403: { description: "Wrong email address", type: "object" },
        404: { description: "Invite not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { token } = req.params as { token: string };
    const result = await svc.acceptInvite(token, req.user.sub);

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return reply.notFound("Invite not found");
        case "already_used":
          return reply.badRequest("Invite has already been used");
        case "expired":
          return reply.badRequest("Invite has expired");
        case "wrong_email":
          return reply.forbidden("This invite is for a different email address");
        case "already_member":
          return reply.badRequest("You are already a member of this family");
      }
    }

    return reply.send({ ok: result.ok, family: result.family });
  });

  // GET /families/:familyId/events
  app.get("/families/:familyId/events", {
    schema: {
      tags: ["Family"],
      summary: "List all calendar events for a family",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["familyId"],
        properties: { familyId: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { events: { type: "array" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Family not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { familyId } = req.params as { familyId: string };
    const events = await svc.listCalendarEvents(familyId, req.user.sub);
    if (!events) return reply.notFound("Family not found");
    return { events };
  });

  // GET /families/:familyId/events/upcoming
  app.get("/families/:familyId/events/upcoming", {
    schema: {
      tags: ["Family"],
      summary: "List upcoming calendar events for a family",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["familyId"],
        properties: { familyId: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { events: { type: "array" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Family not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { familyId } = req.params as { familyId: string };
    const events = await svc.listUpcomingEvents(familyId, req.user.sub);
    if (!events) return reply.notFound("Family not found");
    return { events };
  });

  // POST /families/:familyId/events
  app.post("/families/:familyId/events", {
    schema: {
      tags: ["Family"],
      summary: "Create a calendar event for a family",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["familyId"],
        properties: { familyId: { type: "string" } },
      },
      body: {
        type: "object",
        required: ["childId", "title", "eventType", "startDate"],
        properties: {
          childId: { type: "string" },
          title: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", maxLength: 1000 },
          eventType: {
            type: "string",
            enum: ["appointment", "milestone", "activity", "reminder", "other"],
          },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          allDay: { type: "boolean" },
          location: { type: "string", maxLength: 200 },
          assignedTo: { type: "string" },
          repeatRule: { type: "object" },
        },
      },
      response: {
        200: { type: "object", properties: { event: { type: "object" } } },
        400: { description: "Bad request", type: "object" },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Family not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { familyId } = req.params as { familyId: string };
    const body = createEventSchema.parse(req.body);
    const result = await svc.createCalendarEvent(familyId, req.user.sub, body);

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return reply.notFound("Family not found");
        case "no_children":
          return reply.badRequest(
            "Family must have at least one child to create calendar events",
          );
        case "child_not_in_family":
          return reply.badRequest("Child not found in this family");
        case "assignee_not_found":
          return reply.badRequest("Assigned member not found in this family");
      }
    }

    return reply.send({ event: result.event });
  });

  // PUT /families/:familyId/events/:eventId
  app.put("/families/:familyId/events/:eventId", {
    schema: {
      tags: ["Family"],
      summary: "Update a calendar event",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["familyId", "eventId"],
        properties: {
          familyId: { type: "string" },
          eventId: { type: "string" },
        },
      },
      body: {
        type: "object",
        properties: {
          childId: { type: "string" },
          title: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", maxLength: 1000 },
          eventType: {
            type: "string",
            enum: ["appointment", "milestone", "activity", "reminder", "other"],
          },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          allDay: { type: "boolean" },
          location: { type: "string", maxLength: 200 },
          assignedTo: { type: "string" },
          repeatRule: { type: "object" },
        },
      },
      response: {
        200: { type: "object", properties: { event: { type: "object" } } },
        400: { description: "Bad request", type: "object" },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { familyId, eventId } = req.params as {
      familyId: string;
      eventId: string;
    };
    const body = updateEventSchema.parse(req.body);
    const result = await svc.updateCalendarEvent(
      familyId,
      eventId,
      req.user.sub,
      body,
    );

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return reply.notFound("Family not found");
        case "event_not_found":
          return reply.notFound("Event not found");
        case "child_not_in_family":
          return reply.badRequest("Child not found in this family");
        case "assignee_not_found":
          return reply.badRequest("Assigned member not found in this family");
      }
    }

    return reply.send({ event: result.event });
  });

  // DELETE /families/:familyId/events/:eventId
  app.delete("/families/:familyId/events/:eventId", {
    schema: {
      tags: ["Family"],
      summary: "Delete a calendar event",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["familyId", "eventId"],
        properties: {
          familyId: { type: "string" },
          eventId: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { ok: { type: "boolean" } } },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { familyId, eventId } = req.params as {
      familyId: string;
      eventId: string;
    };
    const result = await svc.deleteCalendarEvent(
      familyId,
      eventId,
      req.user.sub,
    );

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return reply.notFound("Family not found");
        case "event_not_found":
          return reply.notFound("Event not found");
      }
    }

    return reply.send({ ok: true });
  });

  // POST /families/:familyId/calendar/parse-event
  // Parse a free-text description into a structured event draft for the
  // create/edit drawer's "Ask AI" tab. Returns nullable fields so the client
  // can merge into its form state.
  app.post("/families/:familyId/calendar/parse-event", {
    schema: {
      tags: ["Family"],
      summary: "Parse a natural-language description into an event draft",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["familyId"],
        properties: { familyId: { type: "string" } },
      },
      body: {
        type: "object",
        required: ["text"],
        properties: {
          text: { type: "string", minLength: 1, maxLength: 2000 },
          now: { type: "string" },
          existingEvent: {
            type: ["object", "null"],
            additionalProperties: true,
          },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            draft: { type: "object", additionalProperties: true },
          },
        },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Family not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { familyId } = req.params as { familyId: string };
    const body = req.body as {
      text: string;
      now?: string;
      existingEvent?: Record<string, unknown> | null;
    };
    const result = await parseCalendarEvent({
      familyId,
      userId: req.user.sub,
      input: {
        text: body.text,
        now: body.now ?? null,
        existingEvent: body.existingEvent ?? null,
      },
    });
    if ("error" in result) return reply.notFound("Family not found");
    return reply.send({ draft: result });
  });

  // POST /families/:familyId/calendar/feed-token
  // Mint a long-lived signed token the user can paste into Google Calendar / Apple
  // Calendar as a subscription URL. The token grants read-only access to this
  // family's ICS feed for the issuing user.
  app.post("/families/:familyId/calendar/feed-token", {
    schema: {
      tags: ["Family"],
      summary: "Mint a subscription token for the family's ICS feed",
      security: bearerSecurity,
      params: {
        type: "object",
        required: ["familyId"],
        properties: { familyId: { type: "string" } },
      },
      response: {
        200: {
          type: "object",
          properties: {
            url: { type: "string" },
            webcalUrl: { type: "string" },
            token: { type: "string" },
          },
        },
        401: { description: "Unauthorized", type: "object" },
        404: { description: "Family not found", type: "object" },
      },
    },
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { familyId } = req.params as { familyId: string };
    const events = await svc.listCalendarEvents(familyId, req.user.sub);
    if (!events) return reply.notFound("Family not found");

    const token = app.jwt.sign(
      { sub: req.user.sub, familyId, kind: ICS_FEED_KIND },
      { expiresIn: ICS_FEED_EXPIRY },
    );
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
    const baseUrl = host ? `${proto}://${host}` : "";
    const path = `/api/families/${familyId}/events.ics?token=${encodeURIComponent(token)}`;
    const url = `${baseUrl}${path}`;
    const webcalUrl = baseUrl
      ? `webcal://${host}${path}`
      : `webcal:${path}`;
    return reply.send({ url, webcalUrl, token });
  });

  // GET /families/:familyId/events.ics
  // Public-by-token ICS feed (text/calendar). Accepts either an
  // Authorization Bearer token (same auth as the rest of the API) or a
  // ?token=<signed feed jwt> query string so calendar apps that cannot
  // send custom headers (Google / Apple) can subscribe directly.
  app.get("/families/:familyId/events.ics", {
    schema: {
      tags: ["Family"],
      summary: "ICS feed for a family's calendar",
      params: {
        type: "object",
        required: ["familyId"],
        properties: { familyId: { type: "string" } },
      },
      querystring: {
        type: "object",
        properties: { token: { type: "string" } },
      },
    },
  }, async (req, reply) => {
    const { familyId } = req.params as { familyId: string };
    const { token: queryToken } = (req.query as { token?: string }) ?? {};

    let userId: string | null = null;

    if (queryToken) {
      try {
        const payload = app.jwt.verify(queryToken) as {
          sub: string;
          familyId?: string;
          kind?: string;
        };
        if (payload.kind === ICS_FEED_KIND && payload.familyId === familyId) {
          userId = payload.sub;
        }
      } catch {
        // fall through to Bearer auth
      }
    }

    if (!userId) {
      try {
        await req.jwtVerify();
        userId = req.user?.sub ?? null;
      } catch {
        // unauth
      }
    }

    if (!userId) return reply.unauthorized("Invalid or missing feed token");

    const events = await svc.listCalendarEvents(familyId, userId);
    if (!events) return reply.notFound("Family not found");

    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "parenting.app";
    const ics = buildIcsCalendar({
      calendarName: "Family Calendar",
      events: events as unknown as IcsEventInput[],
      productHost: host,
    });

    reply
      .header("Content-Type", "text/calendar; charset=utf-8")
      .header("Content-Disposition", `inline; filename="family-${familyId}.ics"`)
      .header("Cache-Control", "private, max-age=300");
    return ics;
  });
}
