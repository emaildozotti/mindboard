import { MindMap } from '../types';

const ROOT_RADIUS = 260;
const LEVEL_RADIUS = 200;
const MIN_ANGLE_PER_LEAF = 0.35; // radianos mínimos por folha

export function countVisibleLeaves(map: MindMap, nodeId: string): number {
  const node = map.nodes[nodeId];
  if (!node || node.collapsed || node.children.length === 0) return 1;
  return node.children.reduce((sum, cId) => sum + countVisibleLeaves(map, cId), 0);
}

export function computeLayout(map: MindMap): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  function layout(nodeId: string, cx: number, cy: number, startAngle: number, endAngle: number, depth: number) {
    positions[nodeId] = { x: cx, y: cy };
    const node = map.nodes[nodeId];
    if (!node || node.collapsed || node.children.length === 0) return;

    const totalLeaves = node.children.reduce((s, c) => s + countVisibleLeaves(map, c), 0);
    const radius = depth === 0 ? ROOT_RADIUS : LEVEL_RADIUS;
    let cur = startAngle;

    node.children.forEach((childId) => {
      const leaves = countVisibleLeaves(map, childId);
      const share = (endAngle - startAngle) * (leaves / totalLeaves);
      const mid = cur + share / 2;
      layout(childId, cx + Math.cos(mid) * radius, cy + Math.sin(mid) * radius, cur, cur + share, depth + 1);
      cur += share;
    });
  }

  layout(map.rootId, 0, 0, 0, 2 * Math.PI, 0);
  return positions;
}
