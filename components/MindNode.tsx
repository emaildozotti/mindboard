import React, { useEffect, useRef, useState } from 'react';
import { NodeProps } from 'reactflow';
import { Plus, ChevronRight, ChevronDown } from 'lucide-react';

export interface MindNodeData {
  text: string;
  depth: number;
  branchColor: string;
  collapsed: boolean;
  isEditing: boolean;
  childCount: number;
  onAddChild: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onStopEdit: (id: string) => void;
  onSelect: (id: string) => void;
  selected: boolean;
}

export default function MindNode({ id, data }: NodeProps<MindNodeData>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localText, setLocalText] = useState(data.text);
  const isRoot = data.depth === 0;

  useEffect(() => { setLocalText(data.text); }, [data.text]);
  useEffect(() => { if (data.isEditing) inputRef.current?.focus(); }, [data.isEditing]);

  const save = () => {
    data.onTextChange(id, localText || (isRoot ? 'Mapa Mental' : 'Nova ideia'));
    data.onStopEdit(id);
  };

  const color = data.branchColor;

  // Root node styling
  if (isRoot) {
    return (
      <div
        onDoubleClick={() => data.onSelect(id)}
        className="relative group"
        style={{ minWidth: 180 }}
      >
        <div style={{
          background: `linear-gradient(135deg, ${color}ee, ${color}aa)`,
          borderRadius: 24,
          padding: '14px 28px',
          boxShadow: `0 8px 32px ${color}44, 0 2px 8px rgba(0,0,0,0.15)`,
          border: `2px solid ${color}`,
          textAlign: 'center',
          cursor: 'pointer',
        }}>
          {data.isEditing ? (
            <input
              ref={inputRef}
              value={localText}
              onChange={e => setLocalText(e.target.value)}
              onBlur={save}
              onKeyDown={e => { if (e.key === 'Enter') save(); e.stopPropagation(); }}
              className="bg-transparent text-white font-black text-lg outline-none text-center w-full"
              style={{ minWidth: 120 }}
            />
          ) : (
            <span className="text-white font-black text-lg leading-tight block">{data.text || 'Mapa Mental'}</span>
          )}
        </div>
        {/* Add child button */}
        <button
          onMouseDown={e => { e.stopPropagation(); data.onAddChild(id); }}
          className="absolute opacity-0 group-hover:opacity-100 transition-opacity -right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg z-10"
          style={{ background: color, color: 'white' }}
        >
          <Plus size={14} strokeWidth={3} />
        </button>
      </div>
    );
  }

  // Level 1 nodes
  if (data.depth === 1) {
    return (
      <div className="relative group" style={{ minWidth: 140 }}>
        <div
          onDoubleClick={() => { data.onSelect(id); }}
          style={{
            background: color,
            borderRadius: 20,
            padding: '10px 20px',
            boxShadow: `0 4px 16px ${color}44`,
            textAlign: 'center',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          {data.isEditing ? (
            <input
              ref={inputRef}
              value={localText}
              onChange={e => setLocalText(e.target.value)}
              onBlur={save}
              onKeyDown={e => { if (e.key === 'Enter') save(); e.stopPropagation(); }}
              className="bg-transparent text-white font-bold text-sm outline-none text-center w-full"
              style={{ minWidth: 80 }}
            />
          ) : (
            <span className="text-white font-bold text-sm leading-tight block">{data.text || 'Nova ideia'}</span>
          )}
          {/* Collapse toggle */}
          {data.childCount > 0 && (
            <button
              onMouseDown={e => { e.stopPropagation(); data.onToggleCollapse(id); }}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow"
              style={{ background: color, fontSize: 10 }}
            >
              {data.collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
            </button>
          )}
        </div>
        <button
          onMouseDown={e => { e.stopPropagation(); data.onAddChild(id); }}
          className="absolute opacity-0 group-hover:opacity-100 transition-opacity -right-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-md z-10"
          style={{ background: color, color: 'white' }}
        >
          <Plus size={12} strokeWidth={3} />
        </button>
      </div>
    );
  }

  // Level 2+ nodes
  return (
    <div className="relative group" style={{ minWidth: 120 }}>
      <div
        onDoubleClick={() => data.onSelect(id)}
        style={{
          background: 'white',
          borderRadius: 12,
          padding: '7px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderLeft: `4px solid ${color}`,
          cursor: 'pointer',
        }}
      >
        {data.isEditing ? (
          <input
            ref={inputRef}
            value={localText}
            onChange={e => setLocalText(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === 'Enter') save(); e.stopPropagation(); }}
            className="outline-none text-sm font-medium w-full"
            style={{ color: '#1e293b', minWidth: 80 }}
          />
        ) : (
          <span className="text-slate-700 font-medium text-sm leading-tight block">{data.text || 'Nova ideia'}</span>
        )}
        {data.childCount > 0 && (
          <button
            onMouseDown={e => { e.stopPropagation(); data.onToggleCollapse(id); }}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center shadow"
            style={{ background: color, color: 'white' }}
          >
            {data.collapsed ? <ChevronRight size={9} /> : <ChevronDown size={9} />}
          </button>
        )}
      </div>
      <button
        onMouseDown={e => { e.stopPropagation(); data.onAddChild(id); }}
        className="absolute opacity-0 group-hover:opacity-100 transition-opacity -right-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-md z-10"
        style={{ background: color, color: 'white' }}
      >
        <Plus size={11} strokeWidth={3} />
      </button>
    </div>
  );
}
