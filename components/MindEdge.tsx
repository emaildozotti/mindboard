import React from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';

export default function MindEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  const color = data?.color ?? '#6366f1';
  const strokeWidth = data?.depth <= 1 ? 3 : data?.depth <= 2 ? 2 : 1.5;

  return (
    <path
      id={id}
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeOpacity={0.7}
      className="mind-edge"
    />
  );
}
