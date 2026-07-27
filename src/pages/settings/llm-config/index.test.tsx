import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExecutableLLMConfigDTO } from '@/types/api';
import LLMPage from './index';

const services = vi.hoisted(() => ({
  clearUserCapabilityDefault: vi.fn(),
  deleteLLMConfig: vi.fn(),
  getLLMCapabilityDefaults: vi.fn(),
  getLLMConfigs: vi.fn(),
  getLLMProviders: vi.fn(),
  setLLMConfigActive: vi.fn(),
  setUserCapabilityDefault: vi.fn(),
  setupLLMProvider: vi.fn(),
}));

vi.mock('@/services/llm', () => services);

function config(configId: number, scope: 'SYSTEM' | 'USER', editable: boolean): ExecutableLLMConfigDTO {
  return {
    configId,
    scope,
    providerId: 1,
    providerType: 'openai',
    providerName: 'OpenAI',
    modelName: 'gpt-test',
    displayName: scope === 'SYSTEM' ? '平台 GPT' : '我的 GPT',
    capability: 'CHAT',
    protocol: 'openai',
    apiKeyMasked: 'sk-***',
    apiBaseUrl: 'https://example.test/v1',
    isActive: true,
    editable,
    snapshotVersion: 1,
    createdAt: '2026-07-17T00:00:00Z',
    updatedAt: '2026-07-17T00:00:00Z',
  };
}

describe('user LLM config page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    services.getLLMConfigs.mockResolvedValue([config(100, 'SYSTEM', false), config(101, 'USER', true)]);
    services.getLLMCapabilityDefaults.mockResolvedValue([
      {
        capability: 'CHAT',
        configId: null,
      },
    ]);
    services.getLLMProviders.mockResolvedValue([
      {
        providerType: 'openai',
        providerName: 'OpenAI',
        models: [{ modelName: 'gpt-test', capabilities: ['CHAT'] }],
      },
    ]);
  });

  it('renders config actions from editable while keeping SYSTEM config read-only', async () => {
    const { container } = render(
      <MemoryRouter>
        <LLMPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(container.querySelectorAll('[data-config-id="100"]').length).toBeGreaterThan(0));
    const systemRows = [...container.querySelectorAll('[data-config-id="100"]')];
    const userRows = [...container.querySelectorAll('[data-config-id="101"]')];

    expect(systemRows.every((row) => row.querySelectorAll('button').length === 0)).toBe(true);
    expect(userRows.length).toBeGreaterThan(0);
    expect(userRows.every((row) => row.querySelectorAll('button').length === 3)).toBe(true);
  });

  it('loads fresh configs and defaults again after route remount', async () => {
    const first = render(
      <MemoryRouter>
        <LLMPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(services.getLLMConfigs).toHaveBeenCalledTimes(1));
    first.unmount();

    render(
      <MemoryRouter>
        <LLMPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(services.getLLMConfigs).toHaveBeenCalledTimes(2));
    expect(services.getLLMCapabilityDefaults).toHaveBeenCalledTimes(2);
  });

  it('stores a SYSTEM config as the user default instead of clearing the override', async () => {
    const { container } = render(
      <MemoryRouter>
        <LLMPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.querySelector('[data-model-selector="CHAT"]')).not.toBeNull());
    const selector = container.querySelector('[data-model-selector="CHAT"]') as HTMLElement;
    fireEvent.click(selector);
    const option = [...selector.querySelectorAll('button')].find((button) => button.textContent?.includes('平台 GPT'));
    expect(option).toBeDefined();
    fireEvent.click(option!);

    await waitFor(() => expect(services.setUserCapabilityDefault).toHaveBeenCalledWith('CHAT', 100));
    expect(services.clearUserCapabilityDefault).not.toHaveBeenCalled();
  });

  it('clears the user default through the explicit clear option', async () => {
    services.getLLMCapabilityDefaults.mockResolvedValue([
      {
        capability: 'CHAT',
        configId: 101,
      },
    ]);
    const { container } = render(
      <MemoryRouter>
        <LLMPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.querySelector('[data-model-selector="CHAT"]')).not.toBeNull());
    const selector = container.querySelector('[data-model-selector="CHAT"]') as HTMLElement;
    fireEvent.click(selector);
    const clearButton = [...selector.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('清除默认'),
    );
    expect(clearButton).toBeDefined();
    fireEvent.click(clearButton!);

    await waitFor(() => expect(services.clearUserCapabilityDefault).toHaveBeenCalledWith('CHAT'));
  });
});
