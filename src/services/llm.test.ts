import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import {
  clearUserCapabilityDefault,
  createAdminLLMConfig,
  deleteLLMConfig,
  getLLMCapabilityDefault,
  getLLMCapabilityDefaults,
  getLLMConfigs,
  listAdminLLMConfigs,
  setAdminCapabilityDefault,
  setLLMConfigActive,
  setUserCapabilityDefault,
  setupLLMProvider,
  updateAdminLLMConfig,
} from './llm';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    postForm: vi.fn(),
  },
}));

describe('unified LLM service contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses unified user config and default endpoints with configId-only writes', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    vi.mocked(apiClient.post).mockResolvedValue([]);
    vi.mocked(apiClient.patch).mockResolvedValue(undefined);
    vi.mocked(apiClient.put).mockResolvedValue(undefined);
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);

    await getLLMConfigs({ capability: 'CHAT', isActive: true });
    await setupLLMProvider({ providerType: 'openai', apiKey: 'secret' });
    await setLLMConfigActive(101, false);
    await setUserCapabilityDefault('CHAT', 101);
    await clearUserCapabilityDefault('CHAT');
    await deleteLLMConfig(101);
    await getLLMCapabilityDefaults();
    await getLLMCapabilityDefault('CHAT');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/llm/configs', { capability: 'CHAT', isActive: true });
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/llm/configs/setup-provider', {
      providerType: 'openai',
      apiKey: 'secret',
    });
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/llm/configs/101/active', { isActive: false });
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/llm/defaults/CHAT', { configId: 101 });
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/llm/defaults/CHAT');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/llm/configs/101');
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/llm/defaults');
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/llm/defaults/CHAT');
  });

  it('saves an admin platform config with exactly one business write', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    const request = { sourceProviderModelId: 7, apiKey: 'secret', setAsDefault: true };

    await createAdminLLMConfig(request);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/llm/configs', request);
  });

  it('updates a platform config and default through unified admin endpoints', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    vi.mocked(apiClient.put).mockResolvedValue({});
    const request = { sourceProviderModelId: 7, setAsDefault: false };

    await listAdminLLMConfigs({ capability: 'CHAT' });
    await updateAdminLLMConfig(100, request);
    await setAdminCapabilityDefault('CHAT', 100);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/llm/configs', { capability: 'CHAT' });
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/admin/llm/configs/100', request);
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/admin/llm/defaults/CHAT', { configId: 100 });
  });
});
