import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Plus, FileJson, FileImage, ChevronDown, Brain } from 'lucide-react';

interface ToolbarProps {
  onExportImage: (format: 'png' | 'jpg' | 'pdf') => void;
  onExportJSON: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNew: () => void;
}

export default function Toolbar({ onExportImage, onExportJSON, onImport, onNew }: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowExport(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (format: 'png' | 'jpg' | 'pdf') => {
    setShowExport(false);
    setExporting(format.toUpperCase());
    await onExportImage(format);
    setExporting(null);
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shadow-sm z-50 relative">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
          <Brain size={16} className="text-white" />
        </div>
        <span className="font-black text-slate-800 text-lg tracking-tight">MindBoard</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button onClick={onNew} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">
          <Plus size={15} /> Novo
        </button>

        <input type="file" ref={fileRef} onChange={onImport} className="hidden" accept=".json" />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
          <Upload size={15} /> Importar
        </button>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowExport(v => !v)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
            {exporting ? <span className="animate-pulse text-xs font-bold">Exportando {exporting}...</span> : <><Download size={15} /> Exportar <ChevronDown size={13} className={showExport ? 'rotate-180 transition-transform' : 'transition-transform'} /></>}
          </button>

          {showExport && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exportar como</p>
              </div>
              {[
                { fmt: 'png' as const, label: 'PNG', desc: 'Transparente, alta qualidade', color: 'text-emerald-600', bg: 'hover:bg-emerald-50' },
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
