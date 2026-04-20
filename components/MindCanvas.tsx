import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const MindCanvasContent = () => {
  const [mindMap, setMindMap] = useState<MindMap>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return createInitialMap();
  });

  const [selectedId, setSelectedId] = useState<string | null>('root');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Save to localStorage whenever map changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mindMap));
  }, [mindMap]);

  // Stable callback refs to avoid stale closures in useEffect
  const mindMapRef = useRef(mindMap);
  mindMapRef.current = mindMap;

  const handleAddChild = useCallback((parentId: string) => {
    const { map, newId } = addChild(mindMapRef.current, parentId);
    setMindMap(map);
    setSelectedId(newId);
    setTimeout(() => setEditingId(newId), 50);
  }, []);

  const handleAddSibling = useCallback((nodeId: string) => {
    const current = mindMapRef.current;
    if (nodeId === current.rootId) return;
    const { map, newId } = addSibling(current, nodeId);
    setMindMap(map);
    setSelectedId(newId);
    setTimeout(() => setEditingId(newId), 50);
  }, []);

  const handleToggleCollapse = useCallback((nodeId: string) => {
    setMindMap(m => toggleCollapse(m, nodeId));
  }, []);

  const handleTextChange = useCallback((nodeId: string, text: string) => {
    setMindMap(m => updateText(m, nodeId, text));
  }, []);

  const handleStopEdit = useCallback((_nodeId: string) => {
    setEditingId(null);
  }, []);

  const handleSelect = useCallback((nodeId: string) => {
    setSelectedId(nodeId);
    setEditingId(nodeId);
  }, []);

  // Convert MindMap → ReactFlow nodes/edges + apply layout
  useEffect(() => {
    const positions = computeLayout(mindMap);
    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];

    Object.values(mindMap.nodes).forEach(node => {
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

      if (node.parentId) {
        // Only add edge if parent node is not collapsed
        const parent = mindMap.nodes[node.parentId];
        if (parent && !parent.collapsed) {
          rfEdges.push({
            id: `e-${node.parentId}-${node.id}`,
            source: node.parentId,
            target: node.id,
            type: 'mind',
            data: { color: node.branchColor, depth: node.depth },
          });
        }
      }
    });

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [mindMap, selectedId, editingId, handleAddChild, handleToggleCollapse, handleTextChange, handleStopEdit, handleSelect]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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
        const newSel = node.parentId ?? mindMapRef.current.rootId;
        setMindMap(m => deleteNode(m, selectedId));
        setSelectedId(newSel);
        setEditingId(null);
      }
      if (e.key === 'F2' || (e.key === ' ' && !editingId)) { e.preventDefault(); setEditingId(selectedId); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedId, editingId, handleAddChild, handleAddSibling]);

  // Export image
  const exportImage = useCallback(async (format: 'png' | 'jpg' | 'pdf') => {
    const viewportEl = wrapperRef.current?.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportEl || !Object.keys(mindMapRef.current.nodes).length) return;

    // Fit view first
    fitView({ padding: 0.15, duration: 0 });
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    // Compute bounds from current nodes state
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const currentNodes = Array.from(viewportEl.querySelectorAll('.react-flow__node'));
    currentNodes.forEach(el => {
      const htmlEl = el as HTMLElement;
      const transform = htmlEl.style.transform;
      const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
      if (match) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + htmlEl.offsetWidth);
        maxY = Math.max(maxY, y + htmlEl.offsetHeight);
      }
    });

    if (!isFinite(minX)) { minX = -200; minY = -100; maxX = 200; maxY = 100; }

    const pad = 80;
    const cw = maxX - minX, ch = maxY - minY;
    const scale = Math.min(2, Math.min(3000 / (cw + pad * 2), 3000 / (ch + pad * 2)));
    const imgW = Math.round((cw + pad * 2) * scale);
    const imgH = Math.round((ch + pad * 2) * scale);
    const tx = (pad - minX) * scale, ty = (pad - minY) * scale;

    const bg = format === 'jpg' ? '#ffffff' : '#f8fafc';
    const filename = `mindmap-${new Date().toISOString().slice(0, 10)}`;
    const opts = {
      backgroundColor: bg,
      pixelRatio: 2,
      width: imgW,
      height: imgH,
      style: {
        width: `${imgW}px`,
        height: `${imgH}px`,
        transform: `translate(${tx}px,${ty}px) scale(${scale})`,
        transformOrigin: 'top left'
      }
    };

    const dataUrl = format === 'jpg'
      ? await toJpeg(viewportEl, { ...opts, quality: 0.95 })
      : await toPng(viewportEl, opts);

    if (format === 'pdf') {
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>(r => { img.onload = () => r(); });
      const pdf = new jsPDF({
        orientation: imgW > imgH ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgW, imgH],
        hotfixes: ['px_scaling']
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgW, imgH);
      pdf.save(`${filename}.pdf`);
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${filename}.${format}`;
      a.click();
    }
  }, [fitView]);

  // Export JSON
  const exportJSON = useCallback(() => {
    const json = mapToJSON(mindMapRef.current);
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json, null, 2));
    a.download = `mindmap-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }, []);

  // Import JSON
  const importJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        setMindMap(jsonToMap(json));
        setSelectedId(json.root.id);
        setEditingId(null);
        setTimeout(() => fitView({ padding: 0.15, duration: 500 }), 100);
      } catch { alert('JSON inválido.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [fitView]);

  // Clear / new map
  const newMap = useCallback(() => {
    if (!confirm('Criar novo mapa? O atual será apagado.')) return;
    const m = createInitialMap();
    setMindMap(m);
    setSelectedId(m.rootId);
    setEditingId(null);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [fitView]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      <Toolbar onExportImage={exportImage} onExportJSON={exportJSON} onImport={importJSON} onNew={newMap} />
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
          panOnScroll
          selectionOnDrag={false}
          fitView
          style={{ width: '100%', height: '100%' }}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onNodeDoubleClick={(_, node) => { setSelectedId(node.id); setEditingId(node.id); }}
          onPaneClick={() => { setSelectedId(null); setEditingId(null); }}
        >
          <Controls showInteractive={false} />
          <Background color="#cbd5e1" gap={24} size={1} variant={BackgroundVariant.Dots} />
        </ReactFlow>
        {/* Keyboard hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-400 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-100 select-none">
          Tab = filho  ·  Enter = irmão  ·  Delete = remover  ·  F2 = editar  ·  Duplo clique = editar
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
