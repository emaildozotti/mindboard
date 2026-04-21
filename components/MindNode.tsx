import React, { useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { ChevronDown } from 'lucide-react';

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

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, pointerEvents: 'none' as const };

// Renders span (sets node size) + absolute input on top when editing.
// Node dimensions never change when entering edit mode.
function EditableText({
  inputRef,
  localText,
  isEditing,
  onChange,
  onBlur,
  onKeyDown,
  spanClassName,
  inputClassName,
  spanStyle,
  inputStyle,
  placeholder,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  localText: string;
  isEditing: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  spanClassName: string;
  inputClassName: string;
  spanStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  placeholder: string;
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Span always present — determines the node width */}
      <span className={spanClassName} style={{ ...spanStyle, visibility: isEditing ? 'hidden' : 'visible' }}>
        {localText || placeholder}
      </span>
      {/* Input overlaid when editing — same font/size as span */}
      {isEditing && (
        <input
          ref={inputRef}
          value={localText}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={inputClassName}
          style={{ ...inputStyle, position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
}

export default function MindNode({ id, data }: NodeProps<MindNodeData>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localText, setLocalText] = useState(data.text);
  const isRoot = data.depth === 0;
  const color = data.branchColor;

  useEffect(() => { setLocalText(data.text); }, [data.text]);

  useEffect(() => {
    if (data.isEditing) {
      const t = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus({ preventScroll: true });
          inputRef.current.select();
        }
      }, 30);
      return () => clearTimeout(t);
    }
  }, [data.isEditing]);

  const save = () => {
    data.onTextChange(id, localText || (isRoot ? 'Meu Mapa' : 'Nova ideia'));
    data.onStopEdit(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') save();
    e.stopPropagation();
  };

  // Root node
  if (isRoot) {
    return (
      <div className="relative" style={{ minWidth: 160 }}>
        <div style={{
          background: `linear-gradient(135deg, ${color}, ${color}bb)`,
          borderRadius: 28,
          padding: '13px 28px',
          boxShadow: (!data.isEditing && data.selected)
            ? `0 0 0 3px white, 0 0 0 6px ${color}, 0 8px 32px ${color}55`
            : `0 6px 24px ${color}44, 0 2px 8px rgba(0,0,0,0.12)`,
          border: `2px solid ${color}`,
          cursor: 'pointer',
        }}>
          <EditableText
            inputRef={inputRef}
            localText={localText}
            isEditing={data.isEditing}
            onChange={setLocalText}
            onBlur={save}
            onKeyDown={handleKeyDown}
            placeholder="Meu Mapa"
            spanClassName="text-white font-black text-lg leading-tight block select-none whitespace-nowrap"
            inputClassName="bg-transparent text-white font-black text-lg outline-none text-center"
          />
        </div>
        <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
        <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
      </div>
    );
  }

  // Level 1 nodes — solid color pill
  if (data.depth === 1) {
    return (
      <div className="relative" style={{ minWidth: 130 }}>
        <div
          onDoubleClick={() => data.onSelect(id)}
          style={{
            background: color,
            borderRadius: 22,
            padding: '9px 18px',
            boxShadow: (!data.isEditing && data.selected)
              ? `0 0 0 3px white, 0 0 0 5px ${color}`
              : `0 3px 12px ${color}44`,
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <EditableText
            inputRef={inputRef}
            localText={localText}
            isEditing={data.isEditing}
            onChange={setLocalText}
            onBlur={save}
            onKeyDown={handleKeyDown}
            placeholder="Nova ideia"
            spanClassName="text-white font-bold text-sm leading-tight block select-none whitespace-nowrap"
            inputClassName="bg-transparent text-white font-bold text-sm outline-none text-center"
          />
          {data.childCount > 0 && (
            <button
              onMouseDown={e => { e.stopPropagation(); data.onToggleCollapse(id); }}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow z-10"
              style={{ background: color, border: '2px solid white' }}
            >
              {data.collapsed
                ? <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1 }}>{data.childCount}</span>
                : <ChevronDown size={9} strokeWidth={3} />}
            </button>
          )}
        </div>
        <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
        <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
      </div>
    );
  }

  // Level 2+ nodes — tinted pill
  return (
    <div className="relative" style={{ minWidth: 110 }}>
      <div
        onDoubleClick={() => data.onSelect(id)}
        style={{
          background: `${color}18`,
          borderRadius: 999,
          padding: '6px 16px',
          border: (!data.isEditing && data.selected) ? `2px solid ${color}` : `1.5px solid ${color}50`,
          boxShadow: (!data.isEditing && data.selected)
            ? `0 0 0 2px white, 0 0 0 4px ${color}80`
            : `0 1px 4px ${color}20`,
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <EditableText
          inputRef={inputRef}
          localText={localText}
          isEditing={data.isEditing}
          onChange={setLocalText}
          onBlur={save}
          onKeyDown={handleKeyDown}
          placeholder="Nova ideia"
          spanClassName="text-sm font-semibold leading-tight block select-none whitespace-nowrap"
          inputClassName="outline-none text-sm font-semibold bg-transparent text-center"
          spanStyle={{ color }}
          inputStyle={{ color }}
        />
        {data.childCount > 0 && (
          <button
            onMouseDown={e => { e.stopPropagation(); data.onToggleCollapse(id); }}
            className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center shadow z-10"
            style={{ background: color, color: 'white', border: '1.5px solid white' }}
          >
            {data.collapsed
              ? <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1 }}>{data.childCount}</span>
              : <ChevronDown size={8} strokeWidth={3} />}
          </button>
        )}
      </div>
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}
