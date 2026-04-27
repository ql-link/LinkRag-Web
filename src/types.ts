export interface FileItem {
  id: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'PPTX' | 'XLSX';
  size: string;
  date: string;
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
