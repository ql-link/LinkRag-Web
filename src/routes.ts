export const Routes = {
  Root: '/',
  Welcome: '/',
  Home: '/home',
  Datasets: '/datasets',
  DatasetDetail: '/datasets/:id',
  Chats: '/chats',
  ChatDetail: '/chats/:id',
  Files: '/files',
  Settings: '/settings',
  LLMPage: '/settings/llm-config',
  ProfilePage: '/settings/profile',
} as const;
