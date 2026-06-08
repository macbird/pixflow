import { prisma } from '../../core/database';
import { ENTITY_ACTIVE_STATUS, ENTITY_INACTIVE_STATUS, ServerInput } from '@client-manager/shared';
import { encryptCredential, safeDecryptCredential } from '../../core/crypto/credential-crypto';

type ServerWriteInput = ServerInput & { tagIds?: string[] };

function mapServerForList(server: {
  id: string;
  tenantId: string;
  name: string;
  panelUrl: string;
  panelUsername: string | null;
  panelPasswordEncrypted: string | null;
  panelNotes: string | null;
  maxConnections: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  tags: unknown;
}) {
  const { panelPasswordEncrypted: _encrypted, ...rest } = server;
  return rest;
}

function mapServerForDetail(server: {
  id: string;
  tenantId: string;
  name: string;
  panelUrl: string;
  panelUsername: string | null;
  panelPasswordEncrypted: string | null;
  panelNotes: string | null;
  maxConnections: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  tags: unknown;
}) {
  const { panelPasswordEncrypted, ...rest } = server;
  return {
    ...rest,
    panelPassword: safeDecryptCredential(panelPasswordEncrypted),
  };
}

function buildServerPersistenceData(
  input: ServerWriteInput,
  options: { isUpdate: boolean },
): Record<string, unknown> {
  const { tagIds: _tagIds, panelPassword, panelUsername, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };

  if (panelUsername !== undefined) {
    data.panelUsername = panelUsername ?? null;
  }

  if (panelPassword !== undefined) {
    data.panelPasswordEncrypted =
      panelPassword && panelPassword.length > 0 ? encryptCredential(panelPassword) : null;
  } else if (!options.isUpdate) {
    data.panelPasswordEncrypted = null;
  }

  return data;
}

export class ServersService {
  async list(
    tenantId: string,
    page: number,
    pageSize: number,
    filter: string,
    listFilters: Record<string, string> = {},
    selectableOnly = false,
  ) {
    const skip = (page - 1) * pageSize;
    const trimmed = filter.trim();

    const where = {
      tenantId,
      ...(selectableOnly ? { status: ENTITY_ACTIVE_STATUS } : {}),
      ...(trimmed
        ? {
            OR: [
              { name: { contains: trimmed, mode: 'insensitive' as const } },
              { panelUrl: { contains: trimmed, mode: 'insensitive' as const } },
              { panelUsername: { contains: trimmed, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(listFilters.status ? { status: listFilters.status as never } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.server.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { tags: true },
      }),
      prisma.server.count({ where }),
    ]);

    return { data: rows.map(mapServerForList), total };
  }

  async findById(tenantId: string, id: string) {
    const server = await prisma.server.findFirst({
      where: { id, tenantId },
      include: { tags: true },
    });
    if (!server) return null;
    return mapServerForDetail(server);
  }

  async create(tenantId: string, input: ServerWriteInput) {
    const { tagIds } = input;
    const serverData = buildServerPersistenceData(input, { isUpdate: false });
    const created = await prisma.server.create({
      data: {
        ...serverData,
        name: input.name,
        panelUrl: input.panelUrl,
        tenantId,
        tags: tagIds?.length
          ? {
              connect: tagIds.map((tagId: string) => ({ id: tagId })),
            }
          : undefined,
      },
      include: { tags: true },
    });
    return mapServerForDetail({ ...created, tags: created.tags || [] });
  }

  async update(tenantId: string, id: string, input: ServerWriteInput) {
    const { tagIds } = input;
    await prisma.server.findFirstOrThrow({
      where: { id, tenantId },
    });

    const serverData = buildServerPersistenceData(input, { isUpdate: true });
    const updated = await prisma.server.update({
      where: { id },
      data: {
        ...serverData,
        tags:
          tagIds !== undefined
            ? {
                set: tagIds.map((tagId: string) => ({ id: tagId })),
              }
            : undefined,
      },
      include: { tags: true },
    });
    return mapServerForDetail(updated);
  }

  async deactivate(tenantId: string, id: string) {
    await prisma.server.findFirstOrThrow({
      where: { id, tenantId },
    });

    return await prisma.server.update({
      where: { id },
      data: { status: ENTITY_INACTIVE_STATUS },
    });
  }

  async activate(tenantId: string, id: string) {
    await prisma.server.findFirstOrThrow({
      where: { id, tenantId },
    });

    return await prisma.server.update({
      where: { id },
      data: { status: ENTITY_ACTIVE_STATUS },
    });
  }
}
