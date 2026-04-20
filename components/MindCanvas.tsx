import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import ReactFlow, {
  useNodesState, useEdgesState, Controls, Background, BackgroundVariant,
  ConnectionMode, ReactFlowProvider, useReactFlow, Node, Edge
} from 'reactflow';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import MindNode from './MindNode';
import MindEdge from './MindEdge';
import Toolbar from './Toolbar';
import { MindMap } from '../types';
import { computeLayout } from '../utils/layout';
import {
  createInitialMap, addChild, addSibling, deleteNode,
  toggleCollapse, updateText, mapToJSON, jsonToMap
} from '../utils/treeUtils';

const nodeTypes = { mind: MindNode };
const edgeTypes = { mind: MindEdge };
const STORAGE_KEY = 'mindboard-map';

// ── Undo/Redo reducer ──────────────────────────────────────────────
type HistoryState = { past: MindMap[]; present: MindMap; future: MindMap[] };
type HistoryAction =
  | { type: 'SET'; payload: MindMap }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'SET':
      return { past: [...state.past.slice(-49), state.present], present: action.payload, future: [] };
    case 'UNDO':
      if (state.past.length === 0) return state;
      return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: [state.present, ...state.future.slice(0, 49)] };
    case 'REDO':
      if (state.future.length === 0) return state;
      return { past: [...state.past.slice(-49), state.present], present: state.future[0], future: state.future.slice(1) };
  }
}

function loadInitial(): MindMap {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.title) parsed.title = 'Meu Mapa';
      return parsed;
    }
  } catch { /* ignore */ }
  return createInitialMap();
}

// ── Main Canvas ────────────────────────────────────────────────────
const MindCanvasContent = () => {
  const [history, dispatch] = useReducer(historyReducer, undefined, () => ({
    past: [],
    present: loadInitial(),
    future: [],
  }));

  const mindMap = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const setMindMap = useCallback((updater: MindMap | ((m: MindMap) => MindMap)) => {
    dispatch({
      type: 'SET',
      payload: typeof updater === 'function' ? updater(mindMapRef.current) : updater,
    });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const [selectedId, setSelectedId] = useState<string | null>('root');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mindMapRef = useRef(mindMap);
  mindMapRef.current = mindMap;
  const shouldFitRef = useRef(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mindMap));
  }, [mindMap]);

  // Convert MindMap → ReactFlow nodes/edges + apply layout + auto-fitView
  useEffect(() => {
    // Only render nodes visible (not hidden by a collapsed ancestor)
    const visibleIds = new Set<string>();
    const visit = (id: string) => {
      const n = mindMap.nodes[id];
      if (!n) return;
      visibleIds.add(id);
      if (!n.collapsed) n.children.forEach(visit);
    };
    visit(mindMap.rootId);

    const positions = computeLayout(mindMap);
    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];

    Object.values(mindMap.nodes).forEach(node => {
      if (!node || !visibleIds.has(node.id)) return;
      const pos = positions[node.id] ?? { x: 0, y: 0 };
      rfNodes.push({
        id: node.id,
        type: 'mind',
        position: pos,
        draggable: true,
        selectable: true,
        data: {
          text: node.text,
          depth: node.depth,
          branchColor: node.branchColor,
          collapsed: node.collapsed,
          isEditing: editingId === node.id,
          childCount: node.children.length,
          selected: selectedId === node.id,
          onAddChild: handleAddChild,
          onToggleCollapse: handleToggleCollapse,
          onTextChange: handleTextChange,
          onStopEdit: handleStopEdit,
          onSelect: handleSelect,
        },
      });

      if (node.parentId && visibleIds.has(node.parentId)) {
        rfEdges.push({
          id: `e-${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: 'mind',
          data: { color: node.branchColor, depth: node.depth },
        });
      }
    });

    setNodes(rfNodes);
    setEdges(rfEdges);

    if (shouldFitRef.current) {
      shouldFitRef.current = false;
      setTimeout(() => fitView({ padding: 0.18, duration: 350 }), 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindMap]);

  // Update only node data when selection/editing changes (no layout recompute)
  useEffect(() => {
    setNodes(ns => ns.map(n => ({
      ...n,
      data: {
        ...n.data,
        isEditing: editingId === n.id,
        selected: selectedId === n.id,
      },
    })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, editingId]);

  const handleAddChild = useCallback((parentId: string) => {
    const { map, newId } = addChild(mindMapRef.current, parentId);
    shouldFitRef.current = true;
    setMindMap(map);
    setSelectedId(newId);
    setEditingId(newId);
  }, [setMindMap]);

  const handleAddSibling = useCallback((nodeId: string) => {
    const current = mindMapRef.current;
    if (nodeId === current.rootId) return;
    const { map, newId } = addSibling(current, nodeId);
    shouldFitRef.current = true;
    setMindMap(map);
    setSelectedId(newId);
    setEditingId(newId);
  }, [setMindMap]);

  const handleToggleCollapse = useCallback((nodeId: string) => {
    shouldFitRef.current = true;
    setMindMap(toggleCollapse(mindMapRef.current, nodeId));
  }, [setMindMap]);

  const handleTextChange = useCallback((nodeId: string, text: string) => {
    setMindMap(updateText(mindMapRef.current, nodeId, text));
  }, [setMindMap]);

  const handleStopEdit = useCallback((_nodeId: string) => {
    setEditingId(null);
  }, []);

  const handleSelect = useCallback((nodeId: string) => {
    setSelectedId(nodeId);
    setEditingId(nodeId);
  }, []);

  const handleTitleChange = useCallback((title: string) => {
    setMindMap({ ...mindMapRef.current, title });
  }, [setMindMap]);

  const handleCenter = useCallback(() => {
    fitView({ padding: 0.18, duration: 500 });
  }, [fitView]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo (global, even outside input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }

      if (!selectedId) return;
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA'].includes(tag) && editingId) {
        if (e.key === 'Escape') { setEditingId(null); e.preventDefault(); }
        return;
      }
      if (e.key === 'Tab') { e.preventDefault(); handleAddChild(selectedId); }
      if (e.key === 'Enter') { e.preventDefault(); handleAddSibling(selectedId); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId !== mindMapRef.current.rootId) {
        e.preventDefault();
        const node = mindMapRef.current.nodes[selectedId];
        const newSel = node?.parentId ?? mindMapRef.current.rootId;
        shouldFitRef.current = true;
        setMindMap(deleteNode(mindMapRef.current, selectedId));
        setSelectedId(newSel);
        setEditingId(null);
      }
      if (e.key === 'F2' || (e.key === ' ' && !editingId)) { e.preventDefault(); setEditingId(selectedId); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedId, editingId, handleAddChild, handleAddSibling, undo, redo, setMindMap]);

  // Export image
  const exportImage = useCallback(async (format: 'png' | 'jpg' | 'pdf') => {
    const viewportEl = wrapperRef.current?.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportEl) return;

    fitView({ padding: 0.15, duration: 0 });
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    viewportEl.querySelectorAll('.react-flow__node').forEach(el => {
      const htmlEl = el as HTMLElement;
      const match = htmlEl.style.transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
      if (match) {
        const x = parseFloat(match[1]), y = parseFloat(match[2]);
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + htmlEl.offsetWidth); maxY = Math.max(maxY, y + htmlEl.offsetHeight);
      }
    });
    if (!isFinite(minX)) { minX = -200; minY = -100; maxX = 200; maxY = 100; }

    const pad = 80;
    const cw = maxX - minX, ch = maxY - minY;
    const scale = Math.min(2, Math.min(3000 / (cw + pad * 2), 3000 / (ch + pad * 2)));
    const imgW = Math.round((cw + pad * 2) * scale);
    const imgH = Math.round((ch + pad * 2) * scale);
    const bg = format === 'jpg' ? '#ffffff' : '#f0f2f8';
    const filename = `mindmap-${new Date().toISOString().slice(0, 10)}`;
    const opts = {
      backgroundColor: bg,
      pixelRatio: 2,
      width: imgW,
      height: imgH,
      style: {
        width: `${imgW}px`,
        height: `${imgH}px`,
        transform: `translate(${(pad - minX) * scale}px,${(pad - minY) * scale}px) scale(${scale})`,
        transformOrigin: 'top left'
      }
    };

    const dataUrl = format === 'jpg' ? await toJpeg(viewportEl, { ...opts, quality: 0.95 }) : await toPng(viewportEl, opts);

    if (format === 'pdf') {
      const img = new Image(); img.src = dataUrl;
      await new Promise<void>(r => { img.onload = () => r(); });
      const pdf = new jsPDF({ orientation: imgW > imgH ? 'landscape' : 'portrait', unit: 'px', format: [imgW, imgH], hotfixes: ['px_scaling'] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgW, imgH);
      pdf.save(`${filename}.pdf`);
    } else {
      const a = document.createElement('a');
      a.href = dataUrl; a.download = `${filename}.${format}`; a.click();
    }
  }, [fitView]);

  const exportJSON = useCallback(() => {
    const json = mapToJSON(mindMapRef.current);
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json, null, 2));
    a.download = `mindmap-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }, []);

  const importJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        shouldFitRef.current = true;
        setMindMap(jsonToMap(json));
        setSelectedId(json.root?.id ?? 'root');
        setEditingId(null);
      } catch { alert('JSON inválido.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [setMindMap]);

  const newMap = useCallback(() => {
    if (!confirm('Criar novo mapa? O atual será apagado.')) return;
    const m = createInitialMap();
    shouldFitRef.current = true;
    dispatch({ type: 'SET', payload: m });
    setSelectedId(m.rootId);
    setEditingId(null);
  }, []);

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#f0f2f8' }}>
      <Toolbar
        title={mindMap.title}
        onTitleChange={handleTitleChange}
        onExportImage={exportImage}
        onExportJSON={exportJSON}
        onImport={importJSON}
        onNew={newMap}
        onUndo={undo}
        onRedo={redo}
        onCenter={handleCenter}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <div className="flex-1 relative" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          panOnDrag={[1, 2]}
          zoomOnDoubleClick={false}
          panOnScroll
          selectionOnDrag={false}
          fitView
          style={{ width: '100%', height: '100%', background: 'transparent' }}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onNodeDoubleClick={(_, node) => { setSelectedId(node.id); setEditingId(node.id); }}
          onPaneClick={() => { setSelectedId(null); setEditingId(null); }}
        >
          <Background color="#c8cfe8" gap={28} size={1} variant={BackgroundVariant.Dots} />
        </ReactFlow>

        {/* Floating zoom controls */}
        <div className="absolute bottom-6 left-6 flex flex-col gap-1 z-50">
          <button
            onClick={() => zoomIn({ duration: 200 })}
            className="w-8 h-8 rounded-lg bg-white shadow border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors font-bold text-base"
            title="Zoom In"
          >+</button>
          <button
            onClick={handleCenter}
            className="w-8 h-8 rounded-lg bg-white shadow border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors text-xs font-bold"
            title="Centralizar"
          >&#8857;</button>
          <button
            onClick={() => zoomOut({ duration: 200 })}
            className="w-8 h-8 rounded-lg bg-white shadow border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors font-bold text-base"
            title="Zoom Out"
          >&#8722;</button>
        </div>

        {/* Keyboard hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-400 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-100 select-none whitespace-nowrap">
          <span className="font-semibold text-slate-500">Tab</span> filho &middot; <span className="font-semibold text-slate-500">Enter</span> irmão &middot; <span className="font-semibold text-slate-500">Del</span> remover &middot; <span className="font-semibold text-slate-500">F2</span> editar &middot; <span className="font-semibold text-slate-500">Ctrl+Z</span> desfazer
        </div>
      </div>
    </div>
  );
};

export default function MindCanvas() {
  return (
    <ReactFlowProvider>
      <MindCanvasContent />
    </ReactFlowProvider>
  );
}
