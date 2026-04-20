import { MindMap } from '../types';

const H_GAP = 260;   // horizontal gap between depth levels
const V_GAP = 70;    // vertical gap between sibling nodes

function subtreeLeaves(map: MindMap, nodeId: string): number {
  const node = map.nodes[nodeId];
  if (!node || node.collapsed || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + subtreeLeaves(map, c), 0);
}

export function computeLayout(map: MindMap): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  // Place children in order, then center parent between first and last child
  function place(nodeId: string, depth: number, yStart: number): number {
    const node = map.nodes[nodeId];
    if (!node) return yStart + V_GAP;

    const x = depth * H_GAP;

    if (node.collapsed || node.children.length === 0) {
      positions[nodeId] = { x, y: yStart };
      return yStart + V_GAP;
    }

    let curY = yStart;
    node.children.forEach(childId => {
      curY = place(childId, depth + 1, curY);
    });

    const firstY = positions[node.children[0]]?.y ?? yStart;
    const lastY = positions[node.children[node.children.length - 1]]?.y ?? yStart;
    positions[nodeId] = { x, y: (firstY + lastY) / 2 };

    return curY;
  }

  place(map.rootId, 0, 0);

  // Center whole tree around y=0
  const allY = Object.values(positions).map(p => p.y);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const offset = (minY + maxY) / 2;
  Object.keys(positions).forEach(id => {
    positions[id] = { x: positions[id].x, y: positions[id].y - offset };
  });

  return positions;
}
