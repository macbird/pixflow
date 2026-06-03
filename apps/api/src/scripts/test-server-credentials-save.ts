import { prisma } from '../core/database';
import { ServersService } from '../modules/servers/servers.service';

async function main() {
  const tenantId = (
    await prisma.account.findFirst({ select: { id: true } })
  )?.id;

  if (!tenantId) {
    throw new Error('No tenant found');
  }

  const service = new ServersService();
  const server = await prisma.server.findFirst({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
  });

  if (!server) {
    throw new Error('No server found');
  }

  const updated = await service.update(tenantId, server.id, {
    name: server.name,
    panelUrl: server.panelUrl,
    status: server.status,
    panelUsername: 'panel_user_test',
    panelPassword: 'panel_pass_test',
  });

  const loaded = await service.findById(tenantId, server.id);
  console.log('updated username:', updated.panelUsername);
  console.log('loaded username:', loaded?.panelUsername);
  console.log('loaded password:', loaded?.panelPassword);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
