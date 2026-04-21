import { MindMap } from '../types';

const H_PADDING = 48;  // gap between right edge of parent column and left edge of child column
const V_PADDING = 22;  // gap between bottom edge of one sibling and top of next

function nodeHeight(depth: number): number {
  if (depth === 0) return 52;
  if (depth === 1) return 42;
  return 36;
}

function nodeWidth(text: string, depth: number): number {
  // Estimate rendered width from text length + padding
  const chPx = depth === 0 ? 11 : 8.5;
  const pad  = depth === 0 ? 56 : depth === 1 ? 36 : 32;
  const min  = depth === 0 ? 160 : depth === 1 ? 130 : 110;
  return Math.max(min, Math.ceil(text.length * chPx) + pad);
}

export function computeLayout(map: MindMap): Record<string, { x: number; y: number }> {
  // Find max depth
  let maxDepth = 0;
  Object.values(map.nodes).forEach(n => { if (n && n.depth > maxDepth) maxDepth = n.depth; });

  // Max width per depth level (so all nodes at same depth start at the same x column)
  const maxW: number[] = Array(maxDepth + 1).fill(0);
  Object.values(map.nodes).forEach(n => {
    if (!n) return;
    const w = nodeWidth(n.text, n.depth);
    if (w > maxW[n.depth]) maxW[n.depth] = w;
  });

  // Left edge x for each depth column
  const xCol: number[] = [0];
  for (let d = 1; d <= maxDepth; d++) {
    xCol[d] = xCol[d - 1] + maxW[d - 1] + H_PADDING;
  }

  const positions: Record<string, { x: number; y: number }> = {};

  // Returns the next available y after placing nodeId's subtree.
  // yStart is the top y of the first leaf in this subtree.
  function place(nodeId: string, yStart: number): number {
    const node = map.nodes[nodeId];
    if (!node) return yStart;

    const x = xCol[node.depth] ?? 0;
    const h = nodeHeight(node.depth);

    if (node.collapsed || node.children.length === 0) {
      positions[nodeId] = { x, y: yStart };
      return yStart + h + V_PADDING;
    }

    // Place all children first so we know their y positions
    let curY = yStart;
    node.children.forEach(childId => {
      curY = place(childId, curY);
    });

    // Center this node between the centers of first and last child
    const firstId = node.children[0];
    const lastId  = node.children[node.children.length - 1];
    const firstCenter = (positions[firstId]?.y ?? yStart) + nodeHeight(map.nodes[firstId]?.depth ?? 1) / 2;
    const lastCenter  = (positions[lastId]?.y  ?? yStart) + nodeHeight(map.nodes[lastId]?.depth  ?? 1) / 2;
    positions[nodeId] = { x, y: (firstCenter + lastCenter) / 2 - h / 2 };

    return curY;
  }

  place(map.rootId, 0);

  // Vertically center the whole tree around y = 0
  const allY = Object.values(positions).map(p => p.y);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const offset = (minY + maxY) / 2;
  Object.keys(positions).forEach(id => {
    positions[id] = { x: positions[id].x, y: positions[id].y - offset };
  });

  return positions;
}
