import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExecutableLLMConfigDTO } from '@/types/api';
import LLMPage from './index';

const services = vi.hoisted(() => ({
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
    expect([...selector.querySelectorAll('button')].some((button) => button.textContent?.includes('清除默认'))).toBe(
      false,
    );
    const option = [...selector.querySelectorAll('button')].find((button) => button.textContent?.includes('平台 GPT'));
    expect(option).toBeDefined();
    fireEvent.click(option!);

    await waitFor(() => expect(services.setUserCapabilityDefault).toHaveBeenCalledWith('CHAT', 100));
  });

  it('uses the same corner radius for model menus and their selector cards', async () => {
    const { container } = render(
      <MemoryRouter>
        <LLMPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(container.querySelector('[data-model-selector="CHAT"]')).not.toBeNull());
    fireEvent.click(container.querySelector('[data-model-selector="CHAT"]') as HTMLElement);

    const menus = [...container.querySelectorAll('[data-model-selector-menu="CHAT"]')];
    expect(menus).toHaveLength(2);
    expect(menus.every((menu) => menu.className.includes('absolute'))).toBe(true);
    expect(menus[0].className).toContain('rounded-lg');
    expect(menus[1].className).toContain('rounded-md');
  });

  it('keeps the provider order returned by the backend in the provider picker', async () => {
    services.getLLMProviders.mockResolvedValue([
      {
        providerType: 'custom-z',
        providerName: '自定义 Z',
        models: [{ modelName: 'model-z', capabilities: ['CHAT'] }],
      },
      {
        providerType: 'openai',
        providerName: 'OpenAI',
        models: [{ modelName: 'gpt-test', capabilities: ['CHAT'] }],
      },
    ]);

    const { container } = render(
      <MemoryRouter>
        <LLMPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(services.getLLMProviders).toHaveBeenCalledTimes(1));
    const openPickerButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === '配置厂商',
    );
    expect(openPickerButton).toBeDefined();
    fireEvent.click(openPickerButton!);

    await waitFor(() => expect(container.textContent).toContain('自定义 Z'));
    const providerCards = [...container.querySelectorAll('button')].filter(
      (button) => button.textContent?.includes('MODELS') && !button.textContent.includes('配置厂商'),
    );
    expect(providerCards.map((button) => button.textContent)).toEqual([
      expect.stringContaining('自定义 Z'),
      expect.stringContaining('OpenAI'),
    ]);
  });
});
