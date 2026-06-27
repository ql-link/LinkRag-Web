import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ChatWorkspacePanel } from './ChatWorkspacePanel';
import type { ChatWorkspaceSnapshot } from '@/contexts/chatWorkspace';

function makeSnapshot(): ChatWorkspaceSnapshot {
  return {
    activeConversationId: 1,
    loadingConversations: false,
    conversations: [
      {
        id: 1,
        title: 'Test conversation',
        datasetId: 1,
        lastConfigId: null,
        lastModelName: null,
        isPinned: false,
        createdAt: '2026-06-25T10:00:00.000Z',
        updatedAt: '2026-06-25T10:00:00.000Z',
      },
    ],
    onBeginNewConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    onRenameConversation: vi.fn(),
  };
}

describe('ChatWorkspacePanel', () => {
  it('opens the conversation action menu to the right of the more button', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });

    render(
      <MemoryRouter>
        <ChatWorkspacePanel snapshot={makeSnapshot()} />
      </MemoryRouter>,
    );

    const moreButton = screen.getByRole('button', { name: '打开对话操作菜单' });
    moreButton.getBoundingClientRect = vi.fn(
      () =>
        ({
          left: 96,
          right: 120,
          top: 56,
          bottom: 80,
          width: 24,
          height: 24,
          x: 96,
          y: 56,
          toJSON: () => ({}),
        }) as DOMRect,
    );

    fireEvent.click(moreButton);

    const menu = await waitFor(() => screen.getByRole('menu'));
    expect(menu).toHaveStyle({ left: '126px', width: '132px' });
  });
});
