import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ViewState, DataVariable, FormulaBlock } from './types.ts';
import { FormulaParser } from './services/FormulaParser.ts';
import { TemplateLibrary } from './components/TemplateLibrary.tsx';
import { BUSINESS_FUNCTIONS, BusinessFunction } from './constants/functions.ts';
import * as XLSX from 'xlsx';
import { 
  Settings2, 
  BarChart3, 
  Plus, 
  Trash2, 
  Database,
  Sigma,
  ChevronDown,
  ChevronRight,
  Calculator,
  BookOpen,
  Upload,
  Eye,
  Search,
  FunctionSquare,
  Link2,
  Network,
  Split,
  Bot,
  Users,
  FileText,
  Table,
  Layers,
  LayoutGrid,
  X,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Table2,
  MousePointerClick
} from 'lucide-react';

// --- MOCK DATA (INSURANCE SCENARIO) ---
const MOCK_CITIES = [
  { 城市: '上海', 区域: '华东', 保险系数: 1.5 },
  { 城市: '北京', 区域: '华北', 保险系数: 1.4 },
  { 城市: '广州', 区域: '华南', 保险系数: 1.2 },
  { 城市: '深圳', 区域: '华南', 保险系数: 1.3 },
  { 城市: '杭州', 区域: '华东', 保险系数: 1.1 },
  { 城市: '成都', 区域: '西南', 保险系数: 1.0 },
];

const MOCK_ORDERS = [
  { 订单号: 'P001', 城市: '上海', 保费: 20000, 险种: '人寿险', 员工: '张三' },
  { 订单号: 'P002', 城市: '上海', 保费: 10000, 险种: '意外险', 员工: '张三' },
  { 订单号: 'P003', 城市: '杭州', 保费: 50000, 险种: '财产险', 员工: '张三' }, 
  { 订单号: 'P004', 城市: '北京', 保费: 35000, 险种: '人寿险', 员工: '王五' },
  { 订单号: 'P005', 城市: '广州', 保费: 18000, 险种: '意外险', 员工: '赵六' },
  { 订单号: 'P006', 城市: '深圳', 保费: 22000, 险种: '人寿险', 员工: '孙七' },
  { 订单号: 'P007', 城市: '深圳', 保费: 8000,  险种: '意外险', 员工: '孙七' },
  { 订单号: 'P008', 城市: '成都', 保费: 12000, 险种: '财产险', 员工: '吴九' },
];

const MOCK_SALARIES = [
  { 员工: '张三', 职级: 'P6', 部门: '销售一部', 基本薪资: 8000 },
  { 员工: '王五', 职级: 'P5', 部门: '销售二部', 基本薪资: 6500 },
  { 员工: '赵六', 职级: 'P5', 部门: '销售一部', 基本薪资: 7000 },
  { 员工: '孙七', 职级: 'P6', 部门: '销售三部', 基本薪资: 8500 },
  { 员工: '吴九', 职级: 'P4', 部门: '销售二部', 基本薪资: 5000 },
];

const INITIAL_INPUTS: DataVariable[] = [
  { 
    id: '1', 
    name: '城市基础档案', 
    type: 'table', 
    value: MOCK_CITIES.length, 
    rows: MOCK_CITIES,
    fields: ['城市', '区域', '保险系数'],
    dimensionId: '城市' 
  },
  { 
    id: '2', 
    name: '保险销售明细', 
    type: 'table', 
    value: MOCK_ORDERS.length, 
    rows: MOCK_ORDERS,
    fields: ['订单号', '城市', '保费', '险种', '员工'],
    dimensionId: 'Row' // Represents granularity
  },
  { 
    id: '3', 
    name: '员工花名册', 
    type: 'table', 
    value: MOCK_SALARIES.length, 
    rows: MOCK_SALARIES,
    fields: ['员工', '职级', '部门', '基本薪资'],
    dimensionId: '员工'
  }
];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>(ViewState.LOGIC_STUDIO);
  const [inputs, setInputs] = useState<DataVariable[]>(INITIAL_INPUTS);
  const [functionSearch, setFunctionSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['1', '2', '3']));
  
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(INITIAL_INPUTS[1].id);
  // Add state to track selected field
  const [selectedField, setSelectedField] = useState<string | null>(null);

  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Lookup Modal State
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [lookupTargetTableId, setLookupTargetTableId] = useState<string>('');
  const [lookupTargetField, setLookupTargetField] = useState<string>('');
  const [lookupTriggerMode, setLookupTriggerMode] = useState<'full' | 'args'>('full');
  const [savedCursorPos, setSavedCursorPos] = useState<number>(0);

  // Manual override for preview mode, set to null to allow "Auto" detection
  const [previewModeOverride, setPreviewModeOverride] = useState<'detail' | 'aggregate' | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formulas, setFormulas] = useState<(FormulaBlock & { processes?: string[] })[]>([
    {
      id: 'step1',
      targetName: '城市系数',
      expression: 'LOOKUP(城市基础档案, 保险系数)',
      latex: '',
      result: [],
      dependencies: ['城市基础档案'],
      explanation: '获取城市维度属性',
      purpose: '属性获取',
      format: 'number'
    },
    {
      id: 'step2',
      targetName: '本单分成',
      expression: '保费 * 城市系数',
      latex: '',
      result: [],
      dependencies: ['保费', '城市系数'],
      explanation: '行级计算：保费 x 系数',
      purpose: '行级运算',
      format: 'currency'
    },
    {
      id: 'step3',
      targetName: '员工总分成',
      expression: 'SUM_GROUP(本单分成, BY=员工)',
      latex: '',
      result: [],
      dependencies: ['本单分成'],
      groupByField: '员工',
      explanation: '按员工聚合总分成',
      purpose: '聚合计算',
      format: 'currency'
    },
    {
      id: 'step4',
      targetName: '基本薪资',
      expression: 'LOOKUP(员工花名册, 基本薪资)',
      latex: '',
      result: [],
      dependencies: ['员工花名册'],
      explanation: '关联员工基本薪资',
      purpose: '跨表关联',
      format: 'currency'
    },
    {
      id: 'step5',
      targetName: '最终总收入',
      expression: '员工总分成 + 基本薪资',
      latex: '',
      result: [],
      dependencies: ['员工总分成', '基本薪资'],
      explanation: '汇总总收入 (维度自动对齐)',
      purpose: '薪资汇总',
      format: 'currency'
    }
  ]);

  const [editingId, setEditingId] = useState<string | null>('step5');

  const activeFormula = formulas.find(f => f.id === editingId);
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.height = 'auto';
      editorRef.current.style.height = editorRef.current.scrollHeight + 'px';
    }
  }, [activeFormula?.expression, editingId, activeView]);

  const toggleTableExpansion = (id: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length > 0) {
        const fields = Object.keys(jsonData[0] as object);
        const newTable: DataVariable = {
          id: Date.now().toString(),
          name: file.name.replace(/\.[^/.]+$/, ""), 
          type: 'table',
          value: jsonData.length,
          rows: jsonData,
          fields: fields,
          dimensionId: 'Auto-Detect'
        };

        setInputs(prev => [...prev, newTable]);
        setSelectedSourceId(newTable.id);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Failed to parse Excel file", error);
      alert("文件解析失败");
    }
  };

  const deleteStep = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (formulas.length <= 1) {
        alert("至少保留一个计算步骤");
        return;
    }
    const idx = formulas.findIndex(f => f.id === id);
    const newFormulas = formulas.filter(f => f.id !== id);
    setFormulas(newFormulas);
    if (editingId === id) {
        setEditingId(newFormulas[idx - 1]?.id || newFormulas[0]?.id);
    }
  };

  const handleExplainFormula = async () => {
    if (!activeFormula || !activeFormula.expression) return;
    setIsAnalyzing(true);
    try {
        const result = await FormulaParser.explainFormula(activeFormula.expression, inputs);
        setFormulas(prev => prev.map(f => f.id === editingId ? { ...f, ...result } : f));
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const computedFormulas = useMemo(() => {
    const resultsMap = new Map<string, any>();
    const dimensionMap = new Map<string, string>(); // Track dimension of each variable
    
    const baseTable = inputs.find(i => i.id === selectedSourceId) || inputs.find(i => i.type === 'table') || inputs[0];
    if (!baseTable || !baseTable.rows) return [];

    // Base table fields have 'Row' dimension (or whatever the table's granular ID is)
    baseTable.fields?.forEach(f => dimensionMap.set(f, baseTable.dimensionId || 'Row'));

    return formulas.map(f => {
      let finalResult: any = 0;
      let processes: string[] = [];
      let currentDeps: string[] = f.dependencies || [];
      let outputDim = 'Row'; // Default to base granularity

      // 1. LOOKUP Handling
      const lookupMatch = f.expression.match(/LOOKUP\s*[(\uff08]\s*(.+?)\s*[,，]\s*(.+?)\s*[)\uff09]/i);
      
      if (lookupMatch) {
          const tableName = lookupMatch[1].trim();
          const targetField = lookupMatch[2].trim();
          const targetTable = inputs.find(t => t.name === tableName);
          
          if (targetTable && targetTable.rows) {
              // Find the join key (common field)
              const joinKey = baseTable.fields?.find(field => targetTable.fields?.includes(field));
              
              if (joinKey) {
                  // If we are joining on 'Employee', the resulting data is conceptually 'Employee' dimension
                  outputDim = joinKey; 

                  const lookups = baseTable.rows.map(row => {
                      const joinVal = row[joinKey];
                      const targetRow = targetTable.rows?.find(r => String(r[joinKey]).trim() === String(joinVal).trim());
                      let val: any = 0;
                      let status = 'miss';
                      if (targetRow && targetRow[targetField] !== undefined) {
                          val = targetRow[targetField];
                          status = 'hit';
                          // Try parse number
                          if (!isNaN(parseFloat(val))) val = parseFloat(val);
                      }
                      return { joinVal, val, status };
                  });
                  finalResult = lookups.map(l => l.val);
                  processes = lookups.map(l => `Match ${joinKey}:${l.joinVal} -> ${l.val}`);
                  if(!currentDeps.includes(tableName)) currentDeps.push(tableName);
              }
          }
      }
      // 2. AGGREGATION_GROUP Handling
      else if (f.expression.match(/(SUM|AVG|MAX|MIN|COUNT)_GROUP\s*[(\uff08]/i)) {
          const aggMatch = f.expression.match(/(SUM|AVG|MAX|MIN|COUNT)_GROUP\s*[(\uff08]\s*(.+?)\s*[,，]\s*BY\s*=\s*(.+?)\s*[)\uff09]/i);
          if (aggMatch) {
              const op = aggMatch[1].toUpperCase();
              const metricName = aggMatch[2].trim();
              const groupField = aggMatch[3].trim();
              
              outputDim = groupField; // Explicitly sets dimension to the Group Key

              let values = resultsMap.get(metricName);
              if (!values) values = baseTable.rows.map(r => parseFloat(r[metricName]) || 0);
              
              if (Array.isArray(values)) {
                 const groups: Record<string, number[]> = {};
                 baseTable.rows.forEach((row, idx) => {
                     const key = row[groupField];
                     if (!groups[key]) groups[key] = [];
                     groups[key].push(values[idx] || 0);
                 });
                 const groupResults: Record<string, number> = {};
                 Object.entries(groups).forEach(([key, vals]) => {
                     switch (op) {
                         case 'SUM': groupResults[key] = vals.reduce((a, b) => a + b, 0); break;
                         case 'AVG': groupResults[key] = vals.reduce((a, b) => a + b, 0) / vals.length; break;
                         case 'MAX': groupResults[key] = Math.max(...vals); break;
                         case 'MIN': groupResults[key] = Math.min(...vals); break;
                         case 'COUNT': groupResults[key] = vals.length; break;
                     }
                 });
                 finalResult = baseTable.rows.map(row => groupResults[row[groupField]] || 0);
                 processes = baseTable.rows.map(row => `Group ${row[groupField]} (${op}) -> ${groupResults[row[groupField]]}`);
              }
          }
      }
      // 3. Pure Math
      else {
        const calculatedValues: any[] = [];
        const traceValues: string[] = [];
        
        // Smart Dimension Logic: Check dependencies' dimensions using Tokenization to avoid substring matching bugs
        const depDims = new Set<string>();
        // Tokenize by operators, parens, spaces, commas
        const tokens = f.expression.split(/[+\-*/^(),\s=<>]+/).map(t => t.trim()).filter(t => t && isNaN(Number(t)));
        
        tokens.forEach(token => {
            if (dimensionMap.has(token)) {
                depDims.add(dimensionMap.get(token)!);
            } else if (baseTable.fields?.includes(token)) {
                // If it's a raw field, it's a Row dependency
                depDims.add(baseTable.dimensionId || 'Row');
            }
        });

        const dims = Array.from(depDims);
        // Rule: If all dependencies are of the same Dimension (e.g., 'Employee'), the result is 'Employee'.
        // If there is any 'Row' dependency mixed in, the result degrades to 'Row'.
        if (dims.length > 0 && dims.every(d => d !== 'Row' && d === dims[0])) {
             outputDim = dims[0];
        } else {
            outputDim = 'Row';
        }

        const sortedResultKeys = Array.from(resultsMap.keys()).sort((a, b) => b.length - a.length);
        const sortedFields = [...(baseTable.fields || [])].sort((a, b) => b.length - a.length);

        baseTable.rows.forEach((row, idx) => {
            let exprToEval = f.expression;
            let traceExpr = f.expression;
            
            sortedResultKeys.forEach((key) => {
               const val = resultsMap.get(key);
               const v = Array.isArray(val) ? val[idx] : val;
               if (exprToEval.includes(key)) {
                   exprToEval = exprToEval.split(key).join(typeof v === 'number' ? v.toString() : `"${v}"`);
                   let displayV = typeof v === 'number' ? parseFloat(v.toFixed(2)) : v;
                   traceExpr = traceExpr.split(key).join(`<span class="font-bold text-indigo-600">${displayV}</span>`);
               }
            });
            sortedFields.forEach(field => {
                if (exprToEval.includes(field)) {
                    const v = row[field];
                    exprToEval = exprToEval.split(field).join(typeof v === 'string' ? `'${v}'` : v);
                    traceExpr = traceExpr.split(field).join(`<span class="font-bold text-slate-700">${v}</span>`);
                }
            });
            try {
                const res = eval(exprToEval);
                calculatedValues.push(isNaN(res) ? 0 : res);
            } catch (e) { calculatedValues.push(0); }
            traceValues.push(traceExpr);
        });
        processes = traceValues;
        finalResult = calculatedValues;
      }

      resultsMap.set(f.targetName, finalResult);
      dimensionMap.set(f.targetName, outputDim);
      
      return { ...f, result: finalResult, dependencies: currentDeps, processes, outputDimension: outputDim };
    });
  }, [formulas, inputs, selectedSourceId]);

  const insertTextAtCursor = (text: string, overrideCursor?: number) => {
    if (!editorRef.current || !editingId) return;
    const start = overrideCursor !== undefined ? overrideCursor : editorRef.current.selectionStart;
    const end = overrideCursor !== undefined ? overrideCursor : editorRef.current.selectionEnd;
    const currentExpr = activeFormula?.expression || '';
    const newExpr = currentExpr.substring(0, start) + text + currentExpr.substring(end);
    setFormulas(prev => prev.map(f => f.id === editingId ? { ...f, expression: newExpr } : f));
  };
  
  const handleFunctionClick = (fn: BusinessFunction) => {
    if (fn.name === 'LOOKUP') {
        // Save current cursor before opening modal
        setSavedCursorPos(editorRef.current?.selectionStart || 0);
        setLookupTriggerMode('full');
        setLookupTargetTableId(inputs.length > 0 ? inputs[0].id : '');
        setLookupTargetField('');
        setIsLookupModalOpen(true);
    } else {
        insertTextAtCursor(`${fn.name}()`);
    }
  };

  const handleFormulaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const cursor = e.target.selectionStart;
    
    // Update value
    setFormulas(prev => prev.map(f => f.id === editingId ? {...f, expression: newVal} : f));

    // Check for trigger "lookup(" or "LOOKUP("
    const textBefore = newVal.substring(0, cursor);
    if (textBefore.endsWith('LOOKUP(') || textBefore.endsWith('lookup(')) {
       setSavedCursorPos(cursor);
       setLookupTriggerMode('args');
       setLookupTargetTableId(inputs.length > 0 ? inputs[0].id : '');
       setLookupTargetField('');
       setIsLookupModalOpen(true);
    }
  };

  const handleInsertLookup = () => {
    const table = inputs.find(i => i.id === lookupTargetTableId);
    if (table && lookupTargetField) {
        if (lookupTriggerMode === 'args') {
            // User typed "LOOKUP(", so just insert "Table, Field)"
            insertTextAtCursor(`${table.name}, ${lookupTargetField})`, savedCursorPos);
        } else {
            // User clicked button, insert full function "LOOKUP(Table, Field)"
            insertTextAtCursor(`LOOKUP(${table.name}, ${lookupTargetField})`, savedCursorPos);
        }
        setIsLookupModalOpen(false);
    }
  };

  const formatValue = (val: any, format: string | undefined) => {
     if (typeof val !== 'number') return val;
     if (format === 'currency') return `¥${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
     if (format === 'percent') return `${(val * 100).toFixed(2)}%`;
     return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
  
  const getGranularityInfo = (f: FormulaBlock & { outputDimension?: string }) => {
      // Logic Studio Badge
      if (f.expression.match(/_GROUP\s*[(\uff08]/)) return { label: 'Aggregation', icon: Network, color: 'text-orange-600', bg: 'bg-orange-50' };
      if (f.expression.includes('LOOKUP')) return { label: 'Lookup / Join', icon: Link2, color: 'text-blue-600', bg: 'bg-blue-50' };
      if (f.outputDimension && f.outputDimension !== 'Row') return { label: `Dim: ${f.outputDimension}`, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' };
      return { label: 'Row Level', icon: Split, color: 'text-indigo-600', bg: 'bg-indigo-50' };
  };

  const renderReportsView = () => {
    // Dynamic Report Generation
    const baseTable = inputs.find(i => i.id === selectedSourceId) || inputs.find(i => i.type === 'table') || inputs[0];
    
    // Identify available dimensions from formulas
    const computedDims = new Set<string>(['Row']);
    computedFormulas.forEach(f => { if(f.outputDimension) computedDims.add(f.outputDimension); });
    const availableDims = Array.from(computedDims).filter(d => d !== 'Row');

    // Default to first available agg dimension or 'Row'
    const [currentDim, setCurrentDim] = useState<string>(availableDims.length > 0 ? availableDims[0] : 'Row');

    // Prepare Data
    const displayRows = useMemo(() => {
        if (currentDim === 'Row') {
            // Full Detail View
            return baseTable.rows?.map((row, idx) => {
                const r: any = { ...row };
                computedFormulas.forEach(f => { if(Array.isArray(f.result)) r[f.targetName] = f.result[idx]; });
                return r;
            }) || [];
        } else {
            // Aggregate View
            const groups = new Map<string, any>();
            baseTable.rows?.forEach((row, idx) => {
                const key = row[currentDim];
                if (!groups.has(key)) {
                    // Initialize with dimension key
                    groups.set(key, { [currentDim]: key, _count: 0 });
                }
                const entry = groups.get(key);
                entry._count++;
                
                // Add computed metrics that match this dimension
                computedFormulas.forEach(f => {
                    if (f.outputDimension === currentDim) {
                        // Since it's the same dimension, value should be consistent across the group
                        entry[f.targetName] = Array.isArray(f.result) ? f.result[idx] : f.result;
                    }
                });
            });
            return Array.from(groups.values());
        }
    }, [currentDim, baseTable, computedFormulas]);

    // Determine Columns
    const columns = useMemo(() => {
        if (displayRows.length === 0) return [];
        return Object.keys(displayRows[0]).filter(k => k !== '_count').map(k => {
            const f = computedFormulas.find(cf => cf.targetName === k);
            return { name: k, format: f?.format, isMetric: !!f };
        });
    }, [displayRows, computedFormulas]);

    return (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
           <div className="h-[64px] border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
               <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                      <BarChart3 className="text-indigo-600" size={18} />
                      <span>Dynamic Report: {baseTable.name}</span>
                   </div>
                   
                   <div className="flex bg-slate-100 p-1 rounded-lg">
                       <button 
                           onClick={() => setCurrentDim('Row')}
                           className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${currentDim === 'Row' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                       >
                           Detail (Row)
                       </button>
                       {availableDims.map(d => (
                           <button 
                               key={d}
                               onClick={() => setCurrentDim(d)}
                               className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${currentDim === d ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                           >
                               By {d}
                           </button>
                       ))}
                   </div>
               </div>
               <div className="text-xs text-slate-400 font-medium">
                   {displayRows.length} Records
               </div>
           </div>
           
           <div className="flex-1 overflow-auto p-8">
               <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                           {columns.map(col => (
                              <th key={col.name} className="px-6 py-4 font-bold text-slate-600 whitespace-nowrap bg-slate-50">
                                 {col.name}
                              </th>
                           ))}
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {displayRows.map((row, idx) => (
                           <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              {columns.map(col => (
                                 <td key={col.name} className="px-6 py-4 text-slate-700 whitespace-nowrap">
                                    <span className={col.isMetric ? 'font-mono font-bold text-indigo-600' : ''}>
                                       {formatValue(row[col.name], col.format)}
                                    </span>
                                 </td>
                              ))}
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
           </div>
        </div>
    );
  };

  const renderLookupModal = () => {
    if (!isLookupModalOpen) return null;
    
    const targetTable = inputs.find(i => i.id === lookupTargetTableId);
    const baseTable = inputs.find(i => i.id === selectedSourceId);
    
    // Auto-detect common join key
    const joinKey = baseTable?.fields?.find(field => targetTable?.fields?.includes(field));

    // Preview Data: Get first 3 rows of target table
    const previewRows = targetTable?.rows?.slice(0, 3) || [];
    const previewCols = targetTable?.fields || [];

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-[600px] flex flex-col overflow-hidden max-h-[80vh]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                             <Link2 size={20} />
                         </div>
                         <div>
                            <h3 className="font-bold text-slate-900">Configure Cross-Table Lookup</h3>
                            <p className="text-[10px] text-slate-500 font-medium">Link data from another source</p>
                         </div>
                    </div>
                    <button onClick={() => setIsLookupModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto">
                    {/* Source Selection */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Source Table</label>
                            <select 
                                value={lookupTargetTableId}
                                onChange={(e) => {
                                    setLookupTargetTableId(e.target.value);
                                    setLookupTargetField('');
                                }}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {inputs.map(input => (
                                    <option key={input.id} value={input.id} disabled={input.id === selectedSourceId}>
                                        {input.name} {input.id === selectedSourceId ? '(Current)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Field Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Return Field</label>
                            <select 
                                value={lookupTargetField}
                                onChange={(e) => setLookupTargetField(e.target.value)}
                                disabled={!targetTable}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                <option value="">Select a field...</option>
                                {targetTable?.fields?.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Join Logic Visualization */}
                    <div className={`p-4 rounded-xl border ${joinKey ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                        <div className="flex items-center gap-2 mb-3">
                             {joinKey ? (
                                 <CheckCircle2 size={16} className="text-emerald-600" />
                             ) : (
                                 <AlertTriangle size={16} className="text-amber-600" />
                             )}
                             <span className={`text-xs font-bold ${joinKey ? 'text-emerald-700' : 'text-amber-700'}`}>
                                 {joinKey ? 'Automatic Link Detected' : 'No Common Link Found'}
                             </span>
                        </div>
                        
                        {joinKey ? (
                             <div className="flex items-center justify-between text-xs text-slate-600 bg-white/60 p-3 rounded-lg border border-white/50">
                                 <span className="font-bold text-slate-700">{baseTable?.name}</span>
                                 <div className="flex items-center gap-2 text-indigo-500 px-2">
                                     <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-indigo-600">{joinKey}</span>
                                     <ArrowRight size={14} />
                                     <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-indigo-600">{joinKey}</span>
                                 </div>
                                 <span className="font-bold text-slate-700">{targetTable?.name}</span>
                             </div>
                        ) : (
                            <p className="text-xs text-amber-700 leading-relaxed">
                                The system cannot automatically link these tables because they don't share a field with the same name (e.g., "City"). The lookup may return 0.
                            </p>
                        )}
                    </div>

                    {/* Data Preview */}
                    {targetTable && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Table2 size={12}/> Data Preview ({targetTable.name})
                            </label>
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-[10px]">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            {previewCols.map(col => (
                                                <th key={col} className={`px-3 py-2 font-medium text-slate-500 ${col === lookupTargetField ? 'bg-indigo-50 text-indigo-600 font-bold' : ''}`}>
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {previewRows.map((row: any, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                {previewCols.map(col => (
                                                    <td key={col} className={`px-3 py-2 text-slate-700 ${col === lookupTargetField ? 'bg-indigo-50/30 font-bold text-indigo-700' : ''}`}>
                                                        {row[col]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="bg-slate-50 px-3 py-1.5 text-[9px] text-slate-400 border-t border-slate-200 text-center">
                                    Showing first 3 rows
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setIsLookupModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                    <button 
                        onClick={handleInsertLookup}
                        disabled={!lookupTargetField}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Insert Formula
                    </button>
                </div>
            </div>
        </div>
    );
  };

  const renderCalculationResult = () => {
     return (
        <div className="flex h-full font-sans text-slate-900 overflow-hidden">
            {/* === LEFT COLUMN: Data & Functions === */}
            <div className="w-[280px] border-r border-slate-200 flex flex-col bg-slate-50 shrink-0">
                <div className="p-4 border-b border-slate-200 bg-white">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Database size={16} className="text-indigo-600"/> Data Assets
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="mb-4 px-2">
                         <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full p-2 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center gap-2 text-xs font-bold hover:bg-indigo-200 transition-colors"
                        >
                          <Upload size={14} /> Import Table
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
                    </div>
                    {inputs.map((input) => (
                          <div key={input.id} className={`mb-2 rounded-lg border transition-all bg-white ${selectedSourceId === input.id ? 'border-indigo-400 shadow-sm ring-1 ring-indigo-50' : 'border-slate-200 hover:border-indigo-200'}`}>
                            <div className="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-slate-50" onClick={() => { setSelectedSourceId(input.id); toggleTableExpansion(input.id); }}>
                                {expandedTables.has(input.id) ? <ChevronDown size={14} className="text-slate-300" /> : <ChevronRight size={14} className="text-slate-300" />}
                                <div className="flex-1 overflow-hidden">
                                    <span className="text-xs font-bold text-slate-700 truncate block">{input.name}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">{input.rows?.length} rows</span>
                                </div>
                            </div>
                            {expandedTables.has(input.id) && (
                               <div className="px-2 pb-2 space-y-1 ml-4 border-l-2 border-slate-100 pl-2">
                                 {input.fields?.map(f => {
                                     const isSelected = selectedField === f && selectedSourceId === input.id;
                                     return (
                                     <div 
                                        key={f} 
                                        draggable 
                                        onDragStart={(e) => e.dataTransfer.setData('text/plain', f)} 
                                        onClick={(e) => { 
                                            e.stopPropagation();
                                            setSelectedSourceId(input.id);
                                            setSelectedField(f);
                                        }}
                                        onDoubleClick={() => insertTextAtCursor(f)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-indigo-100 ring-1 ring-indigo-200' : 'hover:bg-indigo-50'}`}
                                     >
                                        <div className={`w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold ${isSelected ? 'bg-indigo-500 text-white' : 'bg-blue-100 text-blue-600'}`}>#</div>
                                        <span className={`text-xs font-medium flex-1 truncate ${isSelected ? 'text-indigo-900 font-bold' : 'text-slate-600'}`}>{f}</span>
                                        {isSelected && <MousePointerClick size={12} className="text-indigo-400 animate-pulse"/>}
                                     </div>
                                 )})}
                               </div>
                            )}
                          </div>
                    ))}
                </div>
                <div className="h-1/3 flex flex-col bg-white shrink-0 border-t border-slate-200">
                     <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><FunctionSquare size={14}/> Functions</span>
                     </div>
                     <div className="flex-1 overflow-y-auto p-2">
                        {BUSINESS_FUNCTIONS.map(fn => (
                           <div key={fn.name} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', fn.name)} onClick={() => handleFunctionClick(fn)} className={`px-3 py-2 bg-white border border-slate-200 rounded-md hover:border-indigo-500 cursor-pointer mb-1 flex justify-between ${fn.name === 'LOOKUP' ? 'ring-1 ring-indigo-100 bg-indigo-50/50' : ''}`}>
                              <span className="text-xs font-bold text-indigo-700 font-mono">{fn.name}</span>
                              <span className="text-[10px] text-slate-400">{fn.displayName}</span>
                           </div>
                        ))}
                     </div>
                </div>
            </div>
    
            {/* === MIDDLE COLUMN: Workspace === */}
            <div className="flex-1 flex flex-col bg-slate-50/50 min-w-0 border-r border-slate-200">
                 {activeFormula ? (
                     <>
                        <div className="p-6 bg-white border-b border-slate-200 shadow-sm z-10">
                            <div className="flex justify-between items-start mb-4">
                                <input 
                                    value={activeFormula.targetName} 
                                    onChange={(e) => setFormulas(prev => prev.map(f => f.id === editingId ? {...f, targetName: e.target.value} : f))}
                                    className="text-xl font-bold text-slate-800 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none w-full"
                                    placeholder="Metric Name..."
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => setIsTemplateLibraryOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"><BookOpen size={14}/> Templates</button>
                                    <button onClick={handleExplainFormula} disabled={isAnalyzing} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100"><Bot size={14}/> Explain</button>
                                </div>
                            </div>
                            <div className="relative">
                                <textarea
                                    ref={editorRef}
                                    value={activeFormula.expression}
                                    onChange={handleFormulaChange}
                                    className="w-full p-5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[120px]"
                                    placeholder="Enter formula... (Double-click fields to insert)"
                                />
                                <div className="absolute bottom-3 right-3">
                                     {(() => {
                                         const info = getGranularityInfo(computedFormulas.find(f => f.id === editingId) || activeFormula);
                                         return (
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${info.bg} ${info.color}`}>
                                                {React.createElement(info.icon, { size: 12 })}
                                                {info.label}
                                            </div>
                                         );
                                     })()}
                                </div>
                            </div>
                        </div>
    
                        <div className="flex-1 overflow-hidden flex flex-col p-6">
                            {(() => {
                                const baseTable = inputs.find(i => i.id === selectedSourceId) || inputs[0];
                                const computedActive = computedFormulas.find(f => f.id === editingId) || activeFormula;
                                const isArrayResult = Array.isArray(computedActive.result);
                                
                                // SMART VIEW LOGIC:
                                // If the dimension is inferred as NOT 'Row' (e.g. 'Employee'), show the Aggregated View by default.
                                const showAggregate = previewModeOverride === 'aggregate' || (previewModeOverride === null && computedActive.outputDimension && computedActive.outputDimension !== 'Row');
                                const aggKey = computedActive.outputDimension && computedActive.outputDimension !== 'Row' ? computedActive.outputDimension : 'Key';
                                
                                // Generate View Data
                                let viewRows = [];
                                if (showAggregate) {
                                    // Deduplicate / Group by the output dimension
                                    const uniqueMap = new Map();
                                    baseTable.rows?.forEach((row, idx) => {
                                        const key = row[aggKey] || 'Unclassified';
                                        if (!uniqueMap.has(key)) {
                                            uniqueMap.set(key, { 
                                                key, 
                                                count: 1,
                                                value: isArrayResult ? computedActive.result[idx] : computedActive.result 
                                            });
                                        } else {
                                            const e = uniqueMap.get(key);
                                            e.count++;
                                        }
                                    });
                                    viewRows = Array.from(uniqueMap.values());
                                } else {
                                    // Show Raw Detail
                                    viewRows = computedActive.processes?.map((p, i) => ({
                                        key: i + 1,
                                        process: p,
                                        value: isArrayResult ? computedActive.result[i] : computedActive.result
                                    })) || [];
                                }

                                return (
                                <>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Eye size={16} className="text-slate-400"/>
                                        <span>Preview: </span>
                                        <span className="text-indigo-600 flex items-center gap-2">
                                            {showAggregate ? `Aggregated by ${aggKey}` : 'Full Detail'}
                                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">{viewRows.length} items</span>
                                        </span>
                                    </h3>
                                    
                                    <div className="flex bg-white border border-slate-200 p-1 rounded-lg">
                                        <button 
                                            onClick={() => setPreviewModeOverride('detail')}
                                            className={`px-3 py-1 rounded text-[10px] font-bold ${previewModeOverride === 'detail' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}
                                        >
                                            <LayoutGrid size={12} className="inline mr-1"/> Raw
                                        </button>
                                        <button 
                                            onClick={() => setPreviewModeOverride(null)}
                                            className={`px-3 py-1 rounded text-[10px] font-bold ${previewModeOverride === null ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}
                                        >
                                            Auto
                                        </button>
                                    </div>
                                </div>
        
                                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                    <div className="overflow-auto p-0 bg-white">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-slate-400 font-medium">{showAggregate ? aggKey : 'Row'}</th>
                                                {showAggregate && <th className="px-4 py-2 text-slate-400 font-medium text-center">Count</th>}
                                                {!showAggregate && <th className="px-4 py-2 text-slate-400 font-medium w-full">Trace</th>}
                                                <th className="px-4 py-2 text-slate-400 font-medium text-right">Result</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                            {viewRows.slice(0, 100).map((row: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="px-4 py-3 font-bold text-slate-700">{row.key}</td>
                                                    {showAggregate && (
                                                        <td className="px-4 py-3 text-center text-slate-400">{row.count}</td>
                                                    )}
                                                    {!showAggregate && (
                                                        <td className="px-4 py-3 text-slate-600 font-mono" dangerouslySetInnerHTML={{__html: row.process}}></td>
                                                    )}
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">
                                                        {formatValue(row.value, computedActive.format)}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                </>
                                );
                            })()}
                        </div>
                     </>
                 ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-4">
                       <Calculator size={48} />
                       <span className="font-bold text-sm">Select a step to edit</span>
                    </div>
                 )}
            </div>

            {/* === RIGHT COLUMN: Steps === */}
            <div className="w-[300px] flex flex-col bg-white shrink-0">
                 <div className="p-4 border-b border-slate-200 bg-white">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Logic Steps</h2>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {formulas.map((step, idx) => (
                       <div 
                          key={step.id}
                          onClick={() => { setEditingId(step.id); setPreviewModeOverride(null); }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all relative group ${editingId === step.id ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-50' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                       >
                          <div className="flex justify-between items-center mb-2">
                             <span className={`text-[10px] font-black uppercase tracking-wider ${editingId === step.id ? 'text-indigo-500' : 'text-slate-400'}`}>STEP {idx + 1}</span>
                             <button onClick={(e) => deleteStep(step.id, e)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                          </div>
                          <div className="font-bold text-slate-800 text-sm mb-1">{step.targetName}</div>
                          <div className="text-xs text-slate-500 truncate font-mono bg-slate-50 p-1.5 rounded border border-slate-100">{step.expression || 'Empty'}</div>
                          
                           {/* Show inferred dimension badge in the list */}
                           {computedFormulas.find(f => f.id === step.id)?.outputDimension && computedFormulas.find(f => f.id === step.id)?.outputDimension !== 'Row' && (
                               <div className="mt-2 flex items-center gap-1 text-[9px] text-purple-600 font-bold uppercase tracking-wider">
                                   <Users size={10} /> By {computedFormulas.find(f => f.id === step.id)?.outputDimension}
                               </div>
                           )}

                          {editingId === step.id && (
                              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r"></div>
                          )}
                       </div>
                    ))}
                    <button 
                       onClick={() => {
                          const newId = Date.now().toString();
                          setFormulas(prev => [...prev, {
                             id: newId, targetName: 'New Metric', expression: '', latex: '', result: [], dependencies: []
                          }]);
                          setEditingId(newId);
                       }}
                       className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 text-xs font-bold hover:bg-white hover:border-indigo-400 hover:text-indigo-500 flex items-center justify-center gap-2"
                    >
                       <Plus size={16} /> Add Step
                    </button>
                 </div>
            </div>
        </div>
     );
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <nav className="w-[70px] bg-indigo-900 flex flex-col items-center py-6 gap-6 shrink-0 z-50">
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50 mb-4">
          <Sigma className="text-white" size={24} />
        </div>
        <div className="flex flex-col gap-4 w-full px-2">
           {[
             { id: ViewState.DATA_SOURCES, icon: Database, label: 'Data' },
             { id: ViewState.LOGIC_STUDIO, icon: FunctionSquare, label: 'Logic' },
             { id: ViewState.REPORTS, icon: BarChart3, label: 'Report' },
           ].map(item => (
             <button 
               key={item.id}
               onClick={() => setActiveView(item.id)}
               className={`group flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeView === item.id ? 'bg-white/10 text-white' : 'text-indigo-300 hover:text-white hover:bg-white/5'}`}
             >
               <item.icon size={20} className="transition-transform group-hover:scale-110" />
               <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
             </button>
           ))}
        </div>
        <div className="mt-auto">
           <button className="p-3 text-indigo-300 hover:text-white transition-colors">
              <Settings2 size={20} />
           </button>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden relative shadow-2xl rounded-l-[2rem] bg-white my-2 mr-2 border border-slate-200 clip-path-main">
         {activeView === ViewState.DATA_SOURCES && (
             <div className="flex items-center justify-center h-full text-slate-400">Select Logic Studio to manage data.</div>
         )}
         {activeView === ViewState.LOGIC_STUDIO && renderCalculationResult()}
         {activeView === ViewState.REPORTS && renderReportsView()}
      </main>

      {renderLookupModal()}

      {isTemplateLibraryOpen && (
        <TemplateLibrary 
           onClose={() => setIsTemplateLibraryOpen(false)}
           onSelect={(template) => {
              if (editingId) {
                  setFormulas(prev => prev.map(f => f.id === editingId ? { ...f, targetName: template.name, expression: template.expression } : f));
                  setIsTemplateLibraryOpen(false);
              }
           }}
        />
      )}
    </div>
  );
};

export default App;