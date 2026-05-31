export interface FileItem {
  id: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'PPTX' | 'XLSX';
  size: string;
  date: string;
  kb_ids: string[];  // 关联的数据集 ID 列表
}

export interface Dataset {
  id: string;
  name: string;
  count: number;
  updated: string;
  file_ids: string[];  // 关联的文件 ID 列表
}

export interface Chat {
  id: string;
  name: string;
  messages: number;
  updated: string;
  kb_ids: string[];  // 关联的数据集 ID 列表
}

export interface KbInfo {
  kb_id: string;
  kb_name: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  group: 'tech' | 'field' | 'app' | 'eval';
  value: number;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}
