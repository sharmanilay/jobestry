import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStorage } from '../../../packages/storage/lib/base/base';
import { StorageEnum } from '../../../packages/storage/lib/base/enums';
import { resetMockStorage, mockStorage } from '../setup';

describe('Storage', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createStorage', () => {
    it('should return fallback value when storage is empty', async () => {
      const storage = createStorage('test-key', { name: 'default' });
      const value = await storage.get();
      expect(value).toEqual({ name: 'default' });
    });

    it('should return stored value when exists', async () => {
      mockStorage['test-key'] = { name: 'stored' };
      const storage = createStorage('test-key', { name: 'default' });
      const value = await storage.get();
      expect(value).toEqual({ name: 'stored' });
    });

    it('should set value correctly', async () => {
      const storage = createStorage('test-key', { name: 'default' });
      await storage.set({ name: 'new-value' });
      const value = await storage.get();
      expect(value).toEqual({ name: 'new-value' });
    });

    it('should update value using function', async () => {
      mockStorage['test-key'] = { count: 5 };
      const storage = createStorage('test-key', { count: 0 });
      await storage.set(prev => ({ count: (prev as { count: number }).count + 1 }));
      const value = await storage.get();
      expect(value).toEqual({ count: 6 });
    });

    it('should notify subscribers on change', async () => {
      const storage = createStorage('test-key', { value: 'initial' });
      const listener = vi.fn();
      storage.subscribe(listener);
      await storage.set({ value: 'updated' });
      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', async () => {
      const storage = createStorage('test-key', { value: 'initial' });
      const listener = vi.fn();
      const unsubscribe = storage.subscribe(listener);
      unsubscribe();
      await storage.set({ value: 'updated' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should get snapshot of current value', async () => {
      mockStorage['test-key'] = { value: 'test' };
      const storage = createStorage('test-key', { value: 'default' });
      await storage.get(); // Wait for initialization
      const snapshot = storage.getSnapshot();
      expect(snapshot).toEqual({ value: 'test' });
    });
  });
});
