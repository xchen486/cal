import React from 'react';
import { FormulaTemplate, FORMULA_TEMPLATES } from '../constants/templates.ts';
import { BookOpen, Search, X } from 'lucide-react';
import { FormulaRenderer } from './FormulaRenderer.tsx';
import { FormulaParser } from '../services/FormulaParser.ts';

interface TemplateLibraryProps {
  onSelect: (template: FormulaTemplate) => void;
  onClose: () => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = React.useState('');
  
  const filteredTemplates = FORMULA_TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = ['Financial', 'HR', 'Sales', 'Generic'] as const;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Formula Library</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Industry Standards</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search templates (e.g. ROI, Gross Profit)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-100 border-transparent rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6 space-y-8">
          {categories.map(cat => {
            const items = filteredTemplates.filter(t => t.category === cat);
            if (items.length === 0) return null;
            
            return (
              <div key={cat} className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cat} Calculations</h3>
                <div className="grid gap-4">
                  {items.map(template => {
                    const { latex } = FormulaParser.evaluate(template.expression, []);
                    return (
                      <div 
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{template.name}</h4>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{template.category}</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">{template.description}</p>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-center">
                          <FormulaRenderer latex={latex} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};