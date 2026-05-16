import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/index.js";
import type {
  CreateMomentInput,
  UpdateMomentInput,
  CreateMediaInput,
  CreateTagInput,
  CreateCommentInput,
  CreateReactionInput,
  CreateAlbumInput,
  UpdateAlbumInput,
} from "./moments.schema.js";

// ---- Moment queries ----

const momentFullInclude = {
  media: { orderBy: { position: "asc" as const } },
  tags: true,
  comments: {
    include: {
      user: { select: { id: true, email: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  reactions: {
    include: {
      user: { select: { id: true, email: true } },
    },
  },
} satisfies Prisma.MomentInclude;

export async function createMoment(
  familyId: string,
  userId: string,
  data: CreateMomentInput,
) {
  return prisma.moment.create({
    data: {
      familyId,
      title: data.title ?? "",
      description: data.description,
      momentType: data.momentType,
      location: data.location,
      createdBy: userId,
      ...(data.createdAt && { createdAt: new Date(data.createdAt) }),
    },
    include: momentFullInclude,
  });
}

export async function updateMoment(momentId: string, data: UpdateMomentInput) {
  return prisma.moment.update({
    where: { id: momentId },
    data: {
      title: data.title,
      description: data.description,
      momentType: data.momentType,
      location: data.location,
      ...(data.createdAt && { createdAt: new Date(data.createdAt) }),
    },
    include: momentFullInclude,
  });
}

export async function deleteMoment(momentId: string) {
  return prisma.moment.delete({ where: { id: momentId } });
}

export async function findMoment(momentId: string, familyId: string) {
  return prisma.moment.findFirst({
    where: { id: momentId, familyId },
    include: momentFullInclude,
  });
}

export async function findMomentOwned(
  momentId: string,
  familyId: string,
  createdBy: string,
) {
  return prisma.moment.findFirst({
    where: { id: momentId, familyId, createdBy },
  });
}

export interface FindMomentsOptions {
  childId?: string;
  memberId?: string;
  momentType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function findMoments(familyId: string, opts: FindMomentsOptions) {
  const where: Prisma.MomentWhereInput = { familyId };

  if (opts.childId) {
    where.tags = { some: { tagType: "child", tagValue: opts.childId } };
  }

  if (opts.memberId) {
    where.tags = { some: { tagType: "member", tagValue: opts.memberId } };
  }

  if (opts.momentType) {
    where.momentType = opts.momentType;
  }

  if (opts.startDate || opts.endDate) {
    where.createdAt = {};
    if (opts.startDate) where.createdAt.gte = new Date(opts.startDate);
    if (opts.endDate) where.createdAt.lte = new Date(opts.endDate);
  }

  if (opts.search) {
    where.OR = [
      { title: { contains: opts.search, mode: "insensitive" } },
      { description: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const [moments, total] = await Promise.all([
    prisma.moment.findMany({
      where,
      include: {
        media: { orderBy: { position: "asc" }, take: 1 },
        tags: true,
        comments: {
          take: 3,
          include: { user: { select: { id: true, email: true } } },
          orderBy: { createdAt: "desc" as const },
        },
        reactions: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.moment.count({ where }),
  ]);

  return { moments, total, limit, offset };
}

// ---- Media queries ----

export async function createMedia(momentId: string, data: CreateMediaInput) {
  return prisma.media.create({
    data: {
      momentId,
      s3Key: data.s3Key,
      mimeType: data.mimeType,
      fileName: data.fileName,
      fileSize: data.fileSize,
      width: data.width,
      height: data.height,
      duration: data.duration,
      position: data.position,
    },
  });
}

export async function findMomentWithMedia(
  momentId: string,
  familyId: string,
  createdBy: string,
  mediaId: string,
) {
  return prisma.moment.findFirst({
    where: { id: momentId, familyId, createdBy },
    include: { media: { where: { id: mediaId } } },
  });
}

export async function deleteMedia(mediaId: string) {
  return prisma.media.delete({ where: { id: mediaId } });
}

// ---- Tag queries ----

export async function createTag(momentId: string, data: CreateTagInput) {
  return prisma.momentTag.create({
    data: { momentId, tagType: data.tagType, tagValue: data.tagValue },
  });
}

export async function deleteTag(tagId: string) {
  return prisma.momentTag.delete({ where: { id: tagId } });
}

export async function findTag(tagId: string, momentId: string) {
  return prisma.momentTag.findFirst({ where: { id: tagId, momentId } });
}

// ---- Comment queries ----

export async function createComment(
  momentId: string,
  userId: string,
  data: CreateCommentInput,
) {
  return prisma.momentComment.create({
    data: { momentId, userId, content: data.content },
    include: { user: { select: { id: true, email: true } } },
  });
}

export async function deleteComment(commentId: string) {
  return prisma.momentComment.delete({ where: { id: commentId } });
}

export async function findComment(
  commentId: string,
  momentId: string,
  userId: string,
) {
  return prisma.momentComment.findFirst({
    where: { id: commentId, momentId, userId },
  });
}

// ---- Reaction queries ----

export async function createReaction(
  momentId: string,
  userId: string,
  data: CreateReactionInput,
) {
  return prisma.momentReaction.upsert({
    where: { momentId_userId: { momentId, userId } },
    update: { reaction: data.reaction },
    create: { momentId, userId, reaction: data.reaction },
    include: { user: { select: { id: true, email: true } } },
  });
}

export async function deleteReaction(momentId: string, userId: string) {
  return prisma.momentReaction.deleteMany({ where: { momentId, userId } });
}

// ---- Album queries ----

const albumFullInclude = {
  albumMoments: {
    include: {
      moment: {
        include: {
          media: { orderBy: { position: "asc" as const } },
          tags: true,
        },
      },
    },
    orderBy: { position: "asc" as const },
  },
} satisfies Prisma.AlbumInclude;

const albumListInclude = {
  albumMoments: {
    include: {
      moment: {
        include: {
          media: { orderBy: { position: "asc" as const }, take: 1 },
        },
      },
    },
    orderBy: { position: "asc" as const },
    take: 1,
  },
} satisfies Prisma.AlbumInclude;

const albumCreateInclude = {
  albumMoments: {
    include: {
      moment: {
        include: {
          media: { orderBy: { position: "asc" as const }, take: 1 },
        },
      },
    },
    orderBy: { position: "asc" as const },
  },
} satisfies Prisma.AlbumInclude;

export async function createAlbum(
  familyId: string,
  userId: string,
  data: CreateAlbumInput,
) {
  return prisma.album.create({
    data: {
      familyId,
      name: data.name,
      description: data.description,
      albumType: data.albumType,
      coverMediaId: data.coverMediaId,
      createdBy: userId,
    },
    include: albumCreateInclude,
  });
}

export async function updateAlbum(albumId: string, data: UpdateAlbumInput) {
  return prisma.album.update({
    where: { id: albumId },
    data,
    include: albumCreateInclude,
  });
}

export async function deleteAlbum(albumId: string) {
  return prisma.album.delete({ where: { id: albumId } });
}

export async function findAlbum(albumId: string, familyId: string) {
  return prisma.album.findFirst({
    where: { id: albumId, familyId },
    include: albumFullInclude,
  });
}

export async function findAlbumOwned(
  albumId: string,
  familyId: string,
  createdBy: string,
) {
  return prisma.album.findFirst({ where: { id: albumId, familyId, createdBy } });
}

export async function findAlbums(familyId: string) {
  return prisma.album.findMany({
    where: { familyId },
    include: albumListInclude,
    orderBy: { updatedAt: "desc" },
  });
}

// ---- AlbumMoment queries ----

export async function addMomentToAlbum(albumId: string, momentId: string) {
  const maxPosition = await prisma.albumMoment.findFirst({
    where: { albumId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  return prisma.albumMoment.create({
    data: {
      albumId,
      momentId,
      position: (maxPosition?.position ?? -1) + 1,
    },
    include: {
      moment: {
        include: { media: { orderBy: { position: "asc" }, take: 1 } },
      },
    },
  });
}

export async function removeMomentFromAlbum(albumId: string, momentId: string, familyId: string) {
  const albumMoment = await prisma.albumMoment.findFirst({
    where: { albumId, momentId, album: { familyId } },
  });

  if (!albumMoment) return null;

  return prisma.albumMoment.delete({ where: { id: albumMoment.id } });
}

export async function checkFamilyAccess(
  familyId: string,
  userId: string,
): Promise<boolean> {
  const family = await prisma.family.findFirst({
    where: {
      id: familyId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
  });
  return !!family;
}
