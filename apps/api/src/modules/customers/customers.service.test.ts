import { describe, expect, it, vi } from 'vitest';
import { CustomersService } from './customers.service';

describe('CustomersService tenant isolation', () => {
  it('list scopes query by tenantId', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const service = new CustomersService({
      customer: { findMany, count },
    } as never);

    await service.list('tenant-a', 1, 10, 'joao');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a' }),
      }),
    );
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a' }),
      }),
    );
  });

  it('findById includes tenantId in where', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const service = new CustomersService({
      customer: { findFirst },
    } as never);

    await service.findById('tenant-b', 'customer-1');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'customer-1', tenantId: 'tenant-b' },
      }),
    );
  });

  it('delete requires matching tenant before delete', async () => {
    const findFirstOrThrow = vi.fn().mockResolvedValue({ id: 'c1' });
    const deleteFn = vi.fn().mockResolvedValue({ id: 'c1' });
    const service = new CustomersService({
      customer: { findFirstOrThrow, delete: deleteFn },
    } as never);

    await service.delete('tenant-c', 'c1');

    expect(findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: 'c1', tenantId: 'tenant-c' },
    });
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});
