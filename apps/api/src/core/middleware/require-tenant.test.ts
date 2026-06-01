import { describe, expect, it, vi } from 'vitest';
import { requireTenantId } from './require-tenant';
import type { FastifyReply, FastifyRequest } from 'fastify';

function mockRequest(tenantId?: string): FastifyRequest {
  return { tenantId, user: tenantId ? { tenantId } : undefined } as FastifyRequest;
}

describe('requireTenantId', () => {
  it('returns tenantId when present on request', () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const reply = { status } as unknown as FastifyReply;

    const result = requireTenantId(mockRequest('tenant-a'), reply);

    expect(result).toBe('tenant-a');
    expect(status).not.toHaveBeenCalled();
  });

  it('responds 403 when tenant context is missing', () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const reply = { status } as unknown as FastifyReply;

    const result = requireTenantId(mockRequest(undefined), reply);

    expect(result).toBeNull();
    expect(status).toHaveBeenCalledWith(403);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Tenant context') }),
    );
  });
});
