import { MindMap, MindNode, MindMapJSON, MindNodeJSON } from '../types';

const BRANCH_COLORS = [
  '#6366f1','#ec4899','#14b8a6','#f59e0b',
  '#ef4444','#10b981','#8b5cf6','#3b82f6',
];

export function createInitialMap(): MindMap {
  const rootId = 'root';
  return {
    rootId,
    title: 'Meu Mapa',
    nodes: {
      [rootId]: { id: rootId, text: 'Meu Mapa Mental', children: [], collapsed: false, depth: 0, branchColor: '#4f46e5', parentId: null },
    },
  };
}

export function assignColors(map: MindMap): MindMap {
  const newMap = { ...map, nodes: { ...map.nodes } };
  const root = newMap.nodes[map.rootId];

  function setColor(nodeId: string, color: string) {
    newMap.nodes[nodeId] = { ...newMap.nodes[nodeId], branchColor: color };
    newMap.nodes[nodeId].children.forEach(c => setColor(c, color));
  }

  root.children.forEach((childId, i) => setColor(childId, BRANCH_COLORS[i % BRANCH_COLORS.length]));
  return newMap;
}

export function addChild(map: MindMap, parentId: string): { map: MindMap; newId: string } {
  const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const parent = map.nodes[parentId];
  const depth = parent.depth + 1;
  const branchColor = parentId === map.rootId
    ? BRANCH_COLORS[parent.children.length % BRANCH_COLORS.length]
    : parent.branchColor;

  const newNode: MindNode = { id: newId, text: '', children: [], collapsed: false, depth, branchColor, parentId };
  const newMap: MindMap = {
    ...map,
    nodes: {
      ...map.nodes,
      [newId]: newNode,
      [parentId]: { ...parent, children: [...parent.children, newId] },
    },
  };
  return { map: assignColors(newMap), newId };
}

export function addSibling(map: MindMap, nodeId: string): { map: MindMap; newId: string } {
  const node = map.nodes[nodeId];
  if (!node.parentId) return addChild(map, map.rootId);

  const parentId = node.parentId;
  const parent = map.nodes[parentId];
  const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const newNode: MindNode = { id: newId, text: '', children: [], collapsed: false, depth: node.depth, branchColor: node.branchColor, parentId };

  const idx = parent.children.indexOf(nodeId);
  const newChildren = [...parent.children];
  newChildren.splice(idx + 1, 0, newId);

  return {
    map: assignColors({
      ...map,
      nodes: {
        ...map.nodes,
        [newId]: newNode,
        [parentId]: { ...parent, children: newChildren },
      },
    }),
    newId,
  };
}

export function deleteNode(map: MindMap, nodeId: string): MindMap {
  if (nodeId === map.rootId) return map;
  const node = map.nodes[nodeId];

  function collectIds(id: string): string[] {
    const n = map.nodes[id];
    return [id, ...(n?.children.flatMap(collectIds) ?? [])];
  }

  const toDelete = new Set(collectIds(nodeId));
  const newNodes = Object.fromEntries(Object.entries(map.nodes).filter(([id]) => !toDelete.has(id)));

  if (node.parentId && newNodes[node.parentId]) {
    newNodes[node.parentId] = { ...newNodes[node.parentId], children: newNodes[node.parentId].children.filter(c => c !== nodeId) };
  }

  return assignColors({ ...map, nodes: newNodes });
}

export function toggleCollapse(map: MindMap, nodeId: string): MindMap {
  const node = map.nodes[nodeId];
  if (node.children.length === 0) return map;
  return { ...map, nodes: { ...map.nodes, [nodeId]: { ...node, collapsed: !node.collapsed } } };
}

export function updateText(map: MindMap, nodeId: string, text: string): MindMap {
  return { ...map, nodes: { ...map.nodes, [nodeId]: { ...map.nodes[nodeId], text } } };
}

// JSON import/export
export function mapToJSON(map: MindMap): MindMapJSON {
  function toJSON(nodeId: string): MindNodeJSON {
    const node = map.nodes[nodeId];
    return { id: node.id, text: node.text, children: node.children.map(toJSON) };
  }
  return { version: '1.0', title: map.nodes[map.rootId].text, root: toJSON(map.rootId) };
}

export function jsonToMap(json: MindMapJSON): MindMap {
  const nodes: Record<string, MindNode> = {};

  function fromJSON(nodeJSON: MindNodeJSON, parentId: string | null, depth: number) {
    nodes[nodeJSON.id] = { id: nodeJSON.id, text: nodeJSON.text, children: nodeJSON.children.map(c => c.id), collapsed: false, depth, branchColor: '#4f46e5', parentId };
    nodeJSON.children.forEach(c => fromJSON(c, nodeJSON.id, depth + 1));
  }

  fromJSON(json.root, null, 0);
  return assignColors({ nodes, rootId: json.root.id, title: json.title ?? 'Meu Mapa' });
}
