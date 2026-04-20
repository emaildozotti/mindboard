import React from 'react';
import { EdgeProps, getBezierPath, Position } from 'reactflow';

export default function MindEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Right,
    targetX,
    targetY,
    targetPosition: Position.Left,
  });

  const color = data?.color ?? '#6366f1';
  const strokeWidth = !data?.depth || data.depth <= 1 ? 2.5 : data.depth <= 2 ? 2 : 1.5;

  return (
    <>
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ pointerEvents: 'stroke', cursor: 'default' }}
      />
      <path
        id={id}
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={0.7}
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
}
