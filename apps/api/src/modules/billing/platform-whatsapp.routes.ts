import type { FastifyInstance } from 'fastify';
import {
  evolutionConnectSchema,
  evolutionTestMessageSchema,
  metaEmbeddedSignupSchema,
} from '@client-manager/shared';
import { sendApiError, sendValidationError } from '../../core/errors/send-api-error';
import { EvolutionConnectionService } from '../../integrations/whatsapp/evolution/evolution-connection.service';
import { MetaEmbeddedSignupService } from '../../integrations/whatsapp/meta/meta-embedded-signup.service';

const evolutionService = new EvolutionConnectionService();
const metaSignupService = new MetaEmbeddedSignupService();

/**
 * Platform admin WhatsApp routes (Evolution + Meta), mirroring tenant settings flows.
 */
export async function platformWhatsappRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticateAdmin);

  app.get('/platform-settings/whatsapp/meta/config', async (_request, reply) => {
    try {
      return metaSignupService.getPublicConfig();
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.get('/platform-settings/whatsapp/meta/connection', async (_request, reply) => {
    try {
      return await metaSignupService.getConnection('platform', 'default');
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.post('/platform-settings/whatsapp/meta/connect', async (request, reply) => {
    const parsed = metaEmbeddedSignupSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    try {
      return await metaSignupService.completeSignup('platform', 'default', parsed.data);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.post('/platform-settings/whatsapp/meta/disconnect', async (_request, reply) => {
    try {
      return await metaSignupService.disconnect('platform', 'default');
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.get('/platform-settings/whatsapp/evolution/connection', async (_request, reply) => {
    try {
      return await evolutionService.getPlatformConnection();
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.post('/platform-settings/whatsapp/evolution/connect', async (request, reply) => {
    const parsed = evolutionConnectSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    try {
      return await evolutionService.startPlatformConnect(parsed.data.phone);
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.post('/platform-settings/whatsapp/evolution/disconnect', async (_request, reply) => {
    try {
      return await evolutionService.disconnectPlatform();
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  app.post('/platform-settings/whatsapp/evolution/test-message', async (request, reply) => {
    const parsed = evolutionTestMessageSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    try {
      return await evolutionService.sendPlatformTestMessage(
        parsed.data.phone,
        parsed.data.text,
      );
    } catch (error) {
      return sendApiError(reply, error);
    }
  });
}
