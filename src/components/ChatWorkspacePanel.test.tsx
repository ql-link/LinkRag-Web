import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ChatWorkspacePanel } from './ChatWorkspacePanel';
import type { ChatWorkspaceSnapshot } from '@/contexts/chatWorkspace';

const conversations = [
  {
    id: 99,
    title: '正在生成的对话',
    datasetId: 1,
    lastConfigId: 77,
    lastModelName: 'test-model',
    isPinned: false,
    createdAt: '2026-07-12T00:00:00Z',
    updatedAt: '2026-07-12T00:00:00Z',
  },
  {
    id: 100,
    title: '普通对话',
    datasetId: 1,
    lastConfigId: 77,
    lastModelName: 'test-model',
    isPinned: false,
    createdAt: '2026-07-11T00:00:00Z',
    updatedAt: '2026-07-11T00:00:00Z',
  },
];

function renderPanel(streamingConversationId: number | null) {
  const snapshot: ChatWorkspaceSnapshot = {
    conversations,
    activeConversationId: 100,
    streamingConversationId,
    loadingConversations: false,
    onBeginNewConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    onRenameConversation: vi.fn(),
  };

  return render(
    <MemoryRouter>
      <ChatWorkspacePanel snapshot={snapshot} />
    </MemoryRouter>,
  );
}

describe('ChatWorkspacePanel 回复中状态', () => {
  it('只在对应 conversation_id 的列表项旁展示转圈', () => {
    renderPanel(99);

    const spinner = screen.getByLabelText('正在回复');
    expect(spinner.closest('.group')).toHaveTextContent('正在生成的对话');
    expect(screen.getAllByLabelText('正在回复')).toHaveLength(1);
  });

  it('终态清除状态后不展示转圈', () => {
    renderPanel(null);
    expect(screen.queryByLabelText('正在回复')).not.toBeInTheDocument();
  });
});
