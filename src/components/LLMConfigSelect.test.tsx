import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutableLLMConfigDTO } from '@/types/api';
import { LLMConfigSelect } from './LLMConfigSelect';

function config(configId: number, scope: 'SYSTEM' | 'USER'): ExecutableLLMConfigDTO {
  return {
    configId,
    scope,
    providerId: 1,
    providerType: 'openai',
    providerName: 'OpenAI',
    modelName: `model-${configId}`,
    capability: 'CHAT',
    protocol: 'openai',
    apiKeyMasked: 'sk-***',
    apiBaseUrl: 'https://example.test/v1',
    isActive: true,
    editable: scope === 'USER',
    snapshotVersion: 1,
    createdAt: '2026-07-17T00:00:00Z',
    updatedAt: '2026-07-17T00:00:00Z',
  };
}

describe('LLMConfigSelect', () => {
  it('uses configId as the only selection identity after options reorder', () => {
    const configs = [config(100, 'SYSTEM'), config(101, 'USER')];
    const onChange = vi.fn();
    const { rerender } = render(
      <LLMConfigSelect
        label="对话模型"
        value={100}
        configs={configs}
        unavailableMessage="暂无模型"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /model-100/ }));
    expect(screen.getByRole('option', { name: /model-100/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: /model-100/ })).toHaveAttribute('data-config-id', '100');

    rerender(
      <LLMConfigSelect
        label="对话模型"
        value={100}
        configs={[...configs].reverse()}
        unavailableMessage="暂无模型"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('option', { name: /model-100/ })).toHaveAttribute('aria-selected', 'true');
  });
});
