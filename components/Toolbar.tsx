import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Plus, FileJson, FileImage, ChevronDown, Brain, Undo2, Redo2, Maximize2 } from 'lucide-react';

interface ToolbarProps {
  title: string;
  onTitleChange: (title: string) => void;
  onExportImage: (format: 'png' | 'jpg' | 'pdf') => void;
  onExportJSON: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNew: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCenter: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function Toolbar({ title, onTitleChange, onExportImage, onExportJSON, onImport, onNew, onUndo, onRedo, onCenter, canUndo, canRedo }: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const menuRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalTitle(title); }, [title]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowExport(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (editingTitle) titleRef.current?.select(); }, [editingTitle]);

  const handleExport = async (format: 'png' | 'jpg' | 'pdf') => {
    setShowExport(false);
    setExporting(format.toUpperCase());
    await onExportImage(format);
    setExporting(null);
  };

  const saveTitle = () => {
    setEditingTitle(false);
    onTitleChange(localTitle || 'Meu Mapa');
  };

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100 shadow-sm z-50 relative gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
          <Brain size={16} className="text-white" />
        </div>
        <span className="font-black text-slate-800 text-lg tracking-tight">MindBoard</span>
      </div>

      {/* Editable title — center */}
      <div className="flex-1 flex justify-center">
        {editingTitle ? (
          <input
            ref={titleRef}
            value={localTitle}
            onChange={e => setLocalTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setLocalTitle(title); } e.stopPropagation(); }}
            className="text-center text-sm font-semibold text-slate-700 border-b-2 border-indigo-400 outline-none bg-transparent max-w-xs w-full"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1 rounded-lg hover:bg-slate-100 max-w-xs truncate"
            title="Clique para renomear"
          >
            {title || 'Meu Mapa'}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Undo/Redo */}
        <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 size={15} />
          </button>
        </div>

        {/* Center */}
        <button
          onClick={onCenter}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200"
          title="Centralizar mapa"
        >
          <Maximize2 size={15} />
        </button>

        <div className="w-px h-5 bg-slate-200" />

        <button onClick={onNew} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
          <Plus size={14} /> Novo
        </button>

        <input type="file" ref={fileRef} onChange={onImport} className="hidden" accept=".json" />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
          <Upload size={14} /> Importar
        </button>

        {/* Export dropdown */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowExport(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors">
            {exporting ? (
              <span className="animate-pulse text-xs font-bold">Exportando {exporting}...</span>
            ) : (
              <><Download size={14} /> Exportar <ChevronDown size={12} className={`transition-transform ${showExport ? 'rotate-180' : ''}`} /></>
            )}
          </button>

          {showExport && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exportar como</p>
              </div>
              {[
                { fmt: 'png' as const, label: 'PNG', desc: 'Fundo claro, alta qualidade', color: 'text-emerald-600', bg: 'hover:bg-emerald-50' },
                { fmt: 'jpg' as const, label: 'JPG', desc: 'Fundo branco, compactado', color: 'text-sky-600', bg: 'hover:bg-sky-50' },
                { fmt: 'pdf' as const, label: 'PDF', desc: 'Documento para compartilhar', color: 'text-rose-600', bg: 'hover:bg-rose-50' },
              ].map(({ fmt, label, desc, color, bg }) => (
                <button key={fmt} onClick={() => handleExport(fmt)} className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${bg}`}>
                  <div className={`p-1.5 rounded-md bg-slate-100 ${color}`}><FileImage size={14} /></div>
                  <div><p className={`text-sm font-bold ${color}`}>{label}</p><p className="text-[10px] text-slate-400">{desc}</p></div>
                </button>
              ))}
              <div className="border-t border-slate-100">
                <button onClick={() => { setShowExport(false); onExportJSON(); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors">
                  <div className="p-1.5 rounded-md bg-slate-100 text-slate-500"><FileJson size={14} /></div>
                  <div><p className="text-sm font-bold text-slate-600">JSON</p><p className="text-[10px] text-slate-400">Backup / importar depois</p></div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
