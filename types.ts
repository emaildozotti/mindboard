export interface MindNode {
  id: string;
  text: string;
  children: string[];
  collapsed: boolean;
  depth: number;
  branchColor: string;
  parentId: string | null;
}

export interface MindMap {
  nodes: Record<string, MindNode>;
  rootId: string;
}

// Formato JSON para import/export (hierarchical, fácil de criar no Claude)
export interface MindMapJSON {
  version: '1.0';
  title: string;
  root: MindNodeJSON;
}

export interface MindNodeJSON {
  id: string;
  text: string;
  children: MindNodeJSON[];
}
