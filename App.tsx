import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ViewState, DataVariable, FormulaBlock } from './types.ts';
import { FormulaParser } from './services/FormulaParser.ts';
import { FormulaRenderer } from './components/FormulaRenderer.tsx';
import { TemplateLibrary } from './components/TemplateLibrary.tsx';
import { FormulaTemplate } from './constants/templates.ts';
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
  Layers,
  Cpu,
  BookOpen,
  GripVertical,
  ArrowRight,
  Sparkles,
  TableProperties,
  GitGraph,
  Search,
  FunctionSquare,
  X,
  Link2,
  Layout,
  Download,
  Upload,
  Eye,
  GripHorizontal,
  PenLine,
  Hash,
  CircleDollarSign,
  Percent
} from 'lucide-react';

// --- MOCK DATA ---
const MOCK_CITIES = [
  { 城市: '上海', 区域: '华东', 国家: '中国' },
  { 城市: '北京', 区域: '华北', 国家: '中国' },
  { 城市: '广州', 区域: '华南', 国家: '中国' },
  { 城市: '深圳', 区域: '华南', 国家: '中国' },
  { 城市: '杭州', 区域: '华东', 国家: '中国' },
  { 城市: '成都', 区域: '西南', 国家: '中国' },
];

// Added '员工' field to link orders to employees
const MOCK_ORDERS = [
  { 订单号: 'O001', 城市: '上海', 金额: 12000, 渠道: '线上', 员工: '张三' },
  { 订单号: 'O002', 城市: '上海', 金额: 8000,  渠道: '线下', 员工: '张三' },
  { 订单号: 'O003', 城市: '北京', 金额: 35000, 渠道: '线上', 员工: '王五' },
  { 订单号: 'O004', 城市: '广州', 金额: 18000, 渠道: '线上', 员工: '赵六' },
  { 订单号: 'O005', 城市: '深圳', 金额: 22000, 渠道: '线下', 员工: '孙七' },
  { 订单号: 'O006', 城市: '杭州', 金额: 9000,  渠道: '线上', 员工: '周八' },
  { 订单号: 'O007', 城市: '成都', 金额: 45000, 渠道: '线下', 员工: '吴九' },
  { 订单号: 'O008', 城市: '深圳', 金额: 5000,  渠道: '线上', 员工: '孙七' },
  { 订单号: 'O009', 城市: '上海', 金额: 6000,  渠道: '线上', 员工: '李四' },
];

const MOCK_SALARIES = [
  { 员工: '张三', 城市: '上海', 薪资: 18000, 部门: '销售部' },
  { 员工: '李四', 城市: '上海', 薪资: 16000, 部门: '销售部' },
  { 员工: '王五', 城市: '北京', 薪资: 22000, 部门: '运营部' },
  { 员工: '赵六', 城市: '广州', 薪资: 15000, 部门: '市场部' },
  { 员工: '孙七', 城市: '深圳', 薪资: 19000, 部门: '销售部' },
  { 员工: '周八', 城市: '杭州', 薪资: 17000, 部门: '财务部' },
  { 员工: '吴九', 城市: '成都', 薪资: 14000, 部门: '销售部' },
];

const INITIAL_INPUTS: DataVariable[] = [
  { 
    id: '1', 
    name: '城市基础档案', 
    type: 'table', 
    value: MOCK_CITIES.length, 
    rows: MOCK_CITIES,
    fields: ['城市', '区域', '国家'],
    dimensionId: '城市' 
  },
  { 
    id: '2', 
    name: '销售订单明细', 
    type: 'table', 
    value: MOCK_ORDERS.length, 
    rows: MOCK_ORDERS,
    fields: ['订单号', '城市', '金额', '渠道', '员工'],
    dimensionId: '订单'
  },
  { 
    id: '3', 
    name: '员工薪资表', 
    type: 'table', 
    value: MOCK_SALARIES.length, 
    rows: MOCK_SALARIES,
    fields: ['员工', '城市', '薪资', '部门'],
    dimensionId: '员工'
  }
];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>(ViewState.LOGIC_STUDIO);
  // Default selected source set to "Employee Salary Table" (id: 3) to show the bonus context
  const [inputs, setInputs] = useState<DataVariable[]>(INITIAL_INPUTS);
  const [previewTab, setPreviewTab] = useState<'result' | 'source'>('result');
  const [functionSearch, setFunctionSearch] = useState('');
  const [dataSourceSearch, setDataSourceSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['1', '2', '3']));
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(INITIAL_INPUTS[2].id);
  const [previewTableId, setPreviewTableId] = useState<string | null>(null);
  const [draggedSourceIdx, setDraggedSourceIdx] = useState<number | null>(null);

  const [reportColumns, setReportColumns] = useState<Set<string>>(new Set(['员工', '城市', '个人单量', '城市平均单量', '奖金系数']));
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const [hoveredFunc, setHoveredFunc] = useState<BusinessFunction | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false);
  const [isDragOverEditor, setIsDragOverEditor] = useState(false);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const [isDimensionMenuOpen, setIsDimensionMenuOpen] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const dimensionMenuRef = useRef<HTMLDivElement>(null);
  const sourceMenuRef = useRef<HTMLDivElement>(null);
  const columnConfigRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Updated formulas to calculate Bonus Coefficient based on City Average
  const [formulas, setFormulas] = useState<(FormulaBlock & { processes?: string[] })[]>([
    {
      id: 'step1',
      targetName: '个人单量',
      expression: 'COUNT(订单号)',
      latex: '',
      result: [],
      dependencies: ['销售订单明细'],
      dataSource: '销售订单明细',
      groupByField: '员工', // Group by Employee to get personal count
      format: 'number'
    },
    {
      id: 'step2',
      targetName: '城市总单量',
      expression: 'COUNT(订单号)',
      latex: '',
      result: [],
      dependencies: ['销售订单明细'],
      dataSource: '销售订单明细',
      groupByField: '城市', // Group by City to get total city orders
      format: 'number'
    },
    {
      id: 'step3',
      targetName: '城市总人数',
      expression: 'COUNT(员工)',
      latex: '',
      result: [],
      dependencies: ['员工薪资表'],
      dataSource: '员工薪资表',
      groupByField: '城市', // Count how many employees in that city
      format: 'number'
    },
    {
      id: 'step4',
      targetName: '城市平均单量',
      expression: '城市总单量 / 城市总人数',
      latex: '',
      result: [],
      dependencies: ['城市总单量', '城市总人数'],
      dataSource: '', // Pure math calculation
      groupByField: '',
      format: 'number'
    },
    {
      id: 'step5',
      targetName: '奖金系数',
      expression: '个人单量 / 城市平均单量',
      latex: '',
      result: [],
      dependencies: ['个人单量', '城市平均单量'],
      dataSource: '',
      groupByField: '',
      format: 'percent'
    }
  ]);

  const [editingId, setEditingId] = useState<string | null>('step5');

  // ... (rest of the component remains the same)
  // Re-pasting standard useEffects and handlers to ensure context integrity

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dimensionMenuRef.current && !dimensionMenuRef.current.contains(event.target as Node)) setIsDimensionMenuOpen(false);
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(event.target as Node)) setIsSourceMenuOpen(false);
      if (columnConfigRef.current && !columnConfigRef.current.contains(event.target as Node)) setIsColumnConfigOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
          type: 'table',
          value: jsonData.length,
          rows: jsonData,
          fields: fields,
          dimensionId: 'Auto-Detect'
        };

        setInputs(prev => [...prev, newTable]);
        setSelectedSourceId(newTable.id);
        
        // Reset input value to allow uploading the same file again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Failed to parse Excel file", error);
      alert("文件解析失败，请确保上传的是有效的 Excel 文件");
    }
  };

  const handleSourceDragStart = (e: React.DragEvent, index: number) => {
      setDraggedSourceIdx(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleSourceDrop = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedSourceIdx === null || draggedSourceIdx === index) return;
      const newInputs = [...inputs];
      const [removed] = newInputs.splice(draggedSourceIdx, 1);
      newInputs.splice(index, 0, removed);
      setInputs(newInputs);
      setDraggedSourceIdx(null);
  };

  const filteredInputs = useMemo(() => {
      if (!dataSourceSearch) return inputs;
      return inputs.filter(i => 
          i.name.toLowerCase().includes(dataSourceSearch.toLowerCase()) || 
          i.fields?.some(f => f.toLowerCase().includes(dataSourceSearch.toLowerCase()))
      );
  }, [inputs, dataSourceSearch]);

  // Auto-expand tables when searching
  useEffect(() => {
      if (dataSourceSearch) {
          const idsToExpand = filteredInputs.map(i => i.id);
          setExpandedTables(new Set(idsToExpand));
      }
  }, [dataSourceSearch, filteredInputs]);

  // --- Main Calculation Logic ---
  // Note: Since we are using Employee Salary Table as base (id=3), the baseTable.rows are employees.
  // The parser logic will try to match rows in other tables (Orders) based on the groupByField.
  // E.g., if groupByField is '城市', it matches Order.城市 with Salary.城市.
  const computedFormulas = useMemo(() => {
    const resultsMap = new Map<string, any>();
    // We explicitly use the Salary table (inputs[2]) as the base context for this scenario
    // to ensure we iterate over employees.
    const baseTable = inputs.find(i => i.name === '员工薪资表') || inputs[0]; 
    if (!baseTable || !baseTable.rows) return [];

    return formulas.map(f => {
      let finalResult: any = 0;
      let processes: string[] = [];
      let currentDeps: string[] = f.dependencies || [];
      
      const rankMatch = f.expression.match(/RANK\((.*?), BY=(.*?)\)/i);
      if (rankMatch) {
         // ... (Keep existing RANK logic)
         const targetField = rankMatch[1].trim();
         const byField = rankMatch[2].trim();
         let values = resultsMap.get(targetField);
         if (!values) {
             const inputSource = inputs.find(i => i.fields?.includes(targetField));
             if (inputSource?.rows) values = inputSource.rows.map(r => parseFloat(r[targetField]) || 0);
         }
         let groupValues = resultsMap.get(byField);
         if (!groupValues) groupValues = baseTable.rows?.map(r => r[byField]);

         if (Array.isArray(values) && Array.isArray(groupValues) && values.length === groupValues.length) {
            const combined = values.map((v, i) => ({ val: v, group: groupValues[i], originalIndex: i }));
            const groups: Record<string, typeof combined> = {};
            combined.forEach(item => {
               if (!groups[item.group]) groups[item.group] = [];
               groups[item.group].push(item);
            });
            const rankedResult = new Array(values.length).fill(0);
            const processTrace = new Array(values.length).fill('');
            Object.entries(groups).forEach(([groupName, items]) => {
               items.sort((a, b) => b.val - a.val);
               items.forEach((item, rankIdx) => {
                  rankedResult[item.originalIndex] = rankIdx + 1;
                  processTrace[item.originalIndex] = `组: ${groupName} → 排名: ${rankIdx + 1}`;
               });
            });
            finalResult = rankedResult;
            processes = processTrace;
            if (!currentDeps.includes(targetField)) currentDeps.push(targetField);
         }
      } 
      else if (f.dataSource && f.groupByField) {
        if (!currentDeps.includes(f.dataSource)) currentDeps = [...currentDeps, f.dataSource];
        const sourceTable = inputs.find(i => i.name === f.dataSource);
        if (sourceTable && sourceTable.rows) {
          const keyField = baseTable.fields?.[0] || 'id';
          // Iterate over the BASE table rows (Employees)
          const sortedIds = baseTable.rows.map(r => r[keyField]); // e.g., Employee Name or ID
          
          finalResult = sortedIds.map((entityId, idx) => {
            // Context Row: The current employee row from the base table
            const contextRow = baseTable.rows![idx];
            // Value to match: The value of the GroupBy field in the CURRENT base row
            // e.g. if groupByField is '城市', we get 'Shanghai' from the employee row.
            // e.g. if groupByField is '员工', we get 'Zhang San' from the employee row.
            const matchValue = contextRow[f.groupByField!];

            // Filter source rows (e.g. Orders) where Order[groupByField] === Employee[groupByField]
            const sourceRows = sourceTable.rows?.filter(r => r[f.groupByField!] === matchValue) || [];

            const sumMatch = f.expression.match(/SUM\((.*?)\)/i);
            const countMatch = f.expression.match(/COUNT\((.*?)\)/i); // Added simple COUNT support

            if (sumMatch) {
              const fieldName = sumMatch[1].trim();
              const total = sourceRows.reduce((s, r) => s + (parseFloat(r[fieldName]) || 0), 0);
              return total;
            } else if (countMatch) {
               return sourceRows.length;
            }

            const avgMatch = f.expression.match(/AVG\((.*?)\)/i);
            if (avgMatch) {
              const fieldName = avgMatch[1].trim();
              const total = sourceRows.reduce((s, r) => s + (parseFloat(r[fieldName]) || 0), 0);
              const count = sourceRows.length || 1;
              return total / count;
            }
            
            return 0;
          });
          
          // Generate simpler traces for this scenario
          processes = finalResult.map((val: any, idx: number) => {
              const contextRow = baseTable.rows![idx];
              const key = contextRow[f.groupByField!];
              return `${f.groupByField}=${key} → Found ${val}`;
          });
        }
      } else {
        // Handle Pure Math Calculations (e.g. A / B)
        const sortedIds = baseTable.rows.map((_, i) => i);
        finalResult = sortedIds.map((_, idx) => {
            let exprToEval = f.expression;
            let traceExpr = f.expression;
            
            // Replace variables with their values for this row
            resultsMap.forEach((val, key) => {
               const v = Array.isArray(val) ? val[idx] : val;
               // Simple replacement (be careful with substrings)
               exprToEval = exprToEval.split(key).join(v);
               
               let displayV = v;
               if (typeof v === 'number') displayV = parseFloat(v.toFixed(2));
               traceExpr = traceExpr.split(key).join(`<span class="font-bold text-indigo-600">${displayV}</span>`);
            });

            try {
                return eval(exprToEval) || 0;
            } catch (e) { return 0; }
        });
        processes = sortedIds.map((_, idx) => {
             let traceExpr = f.expression;
             resultsMap.forEach((val, key) => {
               const v = Array.isArray(val) ? val[idx] : val;
               let displayV = v;
               if (typeof v === 'number') displayV = parseFloat(v.toFixed(2));
               traceExpr = traceExpr.split(key).join(`<span class="font-bold text-indigo-600">${displayV}</span>`);
            });
            return traceExpr;
        });
      }

      resultsMap.set(f.targetName, finalResult);
      return { ...f, result: finalResult, dependencies: currentDeps, processes };
    });
  }, [formulas, inputs]);

  const insertTextAtCursor = (text: string) => {
    if (!editorRef.current || !editingId) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const currentExpr = activeFormula?.expression || '';
    const newExpr = currentExpr.substring(0, start) + text + currentExpr.substring(end);
    setFormulas(prev => prev.map(f => f.id === editingId ? { ...f, expression: newExpr } : f));
  };

  const handleDragStart = (e: React.DragEvent, text: string) => {
    e.dataTransfer.setData('text/plain', text);
  };

  const formatValue = (val: any, format: string | undefined) => {
     if (typeof val !== 'number') return val;
     if (format === 'currency') return `¥${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
     if (format === 'percent') return `${(val * 100).toFixed(2)}%`;
     return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const renderLineageView = () => {
    const nodes: any[] = [];
    const edges: any[] = [];
    const levelMap = new Map<string, number>();

    inputs.forEach(i => {
      levelMap.set(i.name, 0);
      nodes.push({ id: i.name, type: 'source', label: i.name, level: 0, dimension: i.dimensionId });
    });

    let changed = true;
    let maxIter = 10;
    computedFormulas.forEach((f: any) => { if (!levelMap.has(f.targetName)) levelMap.set(f.targetName, 0); });

    while (changed && maxIter-- > 0) {
      changed = false;
      computedFormulas.forEach((f: any) => {
        let maxDepLevel = -1;
        const deps = new Set<string>(f.dependencies || []);
        if (f.dataSource) deps.add(f.dataSource);
        deps.forEach(d => { if (levelMap.has(d)) maxDepLevel = Math.max(maxDepLevel, levelMap.get(d)!); });
        const newLvl = maxDepLevel + 1;
        if (newLvl > (levelMap.get(f.targetName) || 0)) { levelMap.set(f.targetName, newLvl); changed = true; }
      });
    }

    const rowsByLevel: Record<number, any[]> = {};
    nodes.forEach(n => { if (!rowsByLevel[n.level]) rowsByLevel[n.level] = []; rowsByLevel[n.level].push(n); });
    computedFormulas.forEach((f: any) => {
      const lvl = levelMap.get(f.targetName) || 1;
      const node = { id: f.targetName, type: 'formula', label: f.targetName, level: lvl, formulaId: f.id, dimension: f.groupByField || 'Global' };
      nodes.push(node);
      if (!rowsByLevel[lvl]) rowsByLevel[lvl] = []; rowsByLevel[lvl].push(node);
      const deps = new Set<string>(f.dependencies || []);
      if (f.dataSource) deps.add(f.dataSource);
      deps.forEach(d => edges.push({ from: d, to: f.targetName }));
    });

    const NODE_W = 200;
    const NODE_H = 70;
    const X_GAP = 140;
    const Y_GAP = 30;
    const nodePos = new Map<string, { x: number, y: number }>();

    Object.keys(rowsByLevel).forEach(lvlStr => {
      const lvl = parseInt(lvlStr);
      rowsByLevel[lvl].forEach((n, idx) => {
        nodePos.set(n.id, { x: 80 + lvl * (NODE_W + X_GAP), y: 80 + idx * (NODE_H + Y_GAP) });
      });
    });

    return (
      <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col">
        <div className="h-[64px] border-b border-slate-200 bg-white flex items-center px-8 shrink-0 justify-between">
           <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
              <GitGraph className="text-indigo-600" size={18} />
              <span>智能核算血缘图谱</span>
           </div>
        </div>
        <div className="flex-1 overflow-auto p-12 relative cursor-grab active:cursor-grabbing">
           <svg width={3000} height={2000} className="overflow-visible">
              <defs>
                 <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                 </marker>
              </defs>
              {edges.map((e, i) => {
                 const start = nodePos.get(e.from);
                 const end = nodePos.get(e.to);
                 if (!start || !end) return null;
                 const sx = start.x + NODE_W;
                 const sy = start.y + NODE_H / 2;
                 const ex = end.x;
                 const ey = end.y + NODE_H / 2;
                 return <path key={i} d={`M ${sx} ${sy} C ${sx + 80} ${sy}, ${ex - 80} ${ey}, ${ex} ${ey}`} fill="none" stroke="#e2e8f0" strokeWidth="2" markerEnd="url(#arrow)" />;
              })}
              {nodes.map(n => {
                 const pos = nodePos.get(n.id);
                 if (!pos) return null;
                 const isSource = n.type === 'source';
                 return (
                    <g key={n.id} transform={`translate(${pos.x}, ${pos.y})`} className="group" onClick={() => { if (n.formulaId) { setEditingId(n.formulaId); setActiveView(ViewState.LOGIC_STUDIO); } }}>
                       <rect width={NODE_W} height={NODE_H} rx="12" fill="white" stroke={isSource ? '#3b82f6' : '#6366f1'} strokeWidth="1.5" className="shadow-sm group-hover:shadow-md transition-all" />
                       <foreignObject width={NODE_W} height={NODE_H}>
                          <div className="p-3 h-full flex flex-col justify-between">
                             <div className={`text-[7px] font-black uppercase tracking-wider ${isSource ? 'text-blue-500' : 'text-indigo-500'}`}>{isSource ? 'DataSource' : 'LogicMetric'}</div>
                             <div className="text-[11px] font-bold text-slate-700 truncate">{n.label}</div>
                             <div className="flex items-center gap-1 opacity-50"><Layers size={8} /><span className="text-[8px] font-bold uppercase truncate">{n.dimension}</span></div>
                          </div>
                       </foreignObject>
                    </g>
                 );
              })}
           </svg>
        </div>
      </div>
    );
  };

  const renderDataSourcesView = () => {
    // ... (Keep existing implementation)
    const activeSource = inputs.find(i => i.id === selectedSourceId) || inputs[0];
    return (
      <div className="flex-1 flex bg-slate-50 overflow-hidden">
        {/* Table List Sidebar */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">数据资产中心</h2>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1.5 px-3"
            >
              <Upload size={14} />
              <span className="text-[10px] font-bold">导入</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".xlsx, .xls"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {inputs.map(input => (
              <button 
                key={input.id} 
                onClick={() => setSelectedSourceId(input.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group ${selectedSourceId === input.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
              >
                <TableProperties size={20} className={selectedSourceId === input.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'} />
                <div className="overflow-hidden">
                  <div className="text-xs font-bold truncate">{input.name}</div>
                  <div className={`text-[9px] uppercase font-black tracking-tighter mt-0.5 ${selectedSourceId === input.id ? 'text-indigo-200' : 'text-slate-300'}`}>{input.rows?.length} 条记录 / {input.fields?.length} 字段</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* Data Preview Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-[64px] bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
             <div className="flex items-center gap-4">
                <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest">选中表</div>
                <h1 className="font-bold text-slate-800">{activeSource.name}</h1>
             </div>
             <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"><Download size={18} /></button>
                <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
             </div>
          </header>
          <div className="flex-1 overflow-auto p-8">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-full">
               <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                     <tr>
                        {activeSource.fields?.map(f => (
                           <th key={f} className="px-6 py-4 font-bold text-slate-500">{f}</th>
                        ))}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {activeSource.rows?.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                           {activeSource.fields?.map(f => (
                              <td key={f} className="px-6 py-4 text-slate-700">{row[f]}</td>
                           ))}
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReportsView = () => {
    // Ensure we use the Salary Table (which has employees) as the primary driving dimension
    const baseTable = inputs.find(i => i.name === '员工薪资表') || inputs[0]; 
     const availableColumns = [
        ...(baseTable?.fields || []).map(f => ({ name: f, type: 'source', dimension: baseTable?.dimensionId })),
        ...computedFormulas.filter((f: any) => Array.isArray(f.result)).map((f: any) => ({ 
           name: f.targetName, type: 'metric',
           dimension: f.groupByField ? `Agg: ${f.groupByField}` : 'Global',
           format: f.format 
        }))
     ];
     const tableRows = baseTable.rows?.map((entity, idx) => {
        const rowData: Record<string, any> = { ...entity };
        computedFormulas.forEach((f: any) => { if (Array.isArray(f.result)) rowData[f.targetName] = f.result[idx]; });
        return rowData;
     }) || [];

     return (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
           <div className="h-[64px] border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
               <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                  <BarChart3 className="text-indigo-600" size={18} />
                  <span>核算结果报表</span>
               </div>
               <button onClick={() => setIsColumnConfigOpen(!isColumnConfigOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                  <Layout size={14} /> 字段配置
               </button>
           </div>
           <div className="flex-1 overflow-auto p-8">
               <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                           {availableColumns.filter(c => reportColumns.has(c.name)).map(col => (
                              <th key={col.name} className="px-6 py-4 font-bold text-slate-600">
                                 <div className="flex flex-col gap-1.5">
                                    <span>{col.name}</span>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter bg-slate-200 px-1 rounded w-fit">{col.dimension}</span>
                                 </div>
                              </th>
                           ))}
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {tableRows.map((row, idx) => (
                           <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              {availableColumns.filter(c => reportColumns.has(c.name)).map(col => (
                                 <td key={col.name} className="px-6 py-4 text-slate-700">
                                    <span className={col.type === 'metric' ? 'font-mono font-bold text-indigo-600' : ''}>
                                       {formatValue(row[col.name], (col as any).format)}
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

  const renderCalculationResult = () => {
    const activeResult = computedFormulas.find(f => f.id === editingId);
    // Use Salary Table as context base
    const baseTable = inputs.find(i => i.name === '员工薪资表') || inputs[0]; 
    if (!activeResult || !baseTable || !baseTable.rows) return null;
    const isArrayResult = Array.isArray(activeResult.result);

    return (
      <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col">
        {/* Context Information Banner */}
        <div className="bg-indigo-50/50 border-b border-indigo-100 px-4 py-2 flex items-center gap-2 text-xs text-indigo-900">
           <TableProperties size={14} className="text-indigo-500"/>
           <span className="font-bold opacity-70">Result Context:</span>
           <span>Aligned with <span className="font-bold">{baseTable.name}</span></span>
           <span className="text-indigo-300 mx-1">|</span>
           <span className="opacity-70">Primary Key:</span>
           <span className="font-mono font-bold">{baseTable.fields?.[0] || 'Row ID'}</span>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200 font-bold text-slate-500">
            <tr>
              <th className="px-4 py-3 border-r border-slate-100">{baseTable.fields?.[0] || 'ID'}</th>
              <th className="px-4 py-3 border-r border-slate-100">核算轨迹 Trace</th>
              <th className="px-4 py-3 text-right">结果值 ({activeResult.format || 'Auto'})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {baseTable.rows.map((row, idx) => {
              const val = isArrayResult ? activeResult.result[idx] : activeResult.result;
              const proc = activeResult.processes?.[idx] || activeResult.expression;
              return (
                <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100/50">{row[baseTable.fields?.[0] || '']}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono truncate max-w-xs" dangerouslySetInnerHTML={{ __html: proc }}></td>
                  <td className="px-4 py-3 text-right font-black text-indigo-600 font-mono">
                    {formatValue(val, activeResult.format)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSourceTablePreview = () => {
    const activeResult = computedFormulas.find(f => f.id === editingId);
    if (!activeResult || !activeResult.dataSource) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400">
           <Database size={48} className="mb-4 opacity-20" />
           <p className="text-xs font-bold">未关联数据源</p>
           <p className="text-[10px] mt-1">请在上方选择一个数据表作为计算上下文</p>
        </div>
      );
    }

    const sourceTable = inputs.find(i => i.name === activeResult.dataSource);
    if (!sourceTable) return <div className="p-6 text-center text-slate-400 text-xs">找不到数据源: {activeResult.dataSource}</div>;

    return (
      <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col h-full">
         <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
               <TableProperties size={14} className="text-slate-400" />
               <span className="text-xs font-bold text-slate-700">{sourceTable.name}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{sourceTable.rows?.length} rows</span>
         </div>
         <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
               <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0 z-10">
                  <tr>
                     {sourceTable.fields?.map(f => (
                        <th key={f} className="px-4 py-2 font-medium whitespace-nowrap bg-slate-50">{f}</th>
                     ))}
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {sourceTable.rows?.slice(0, 100).map((row, i) => (
                     <tr key={i} className="hover:bg-slate-50">
                        {sourceTable.fields?.map(f => (
                           <td key={f} className="px-4 py-2 text-slate-600 whitespace-nowrap">{row[f]}</td>
                        ))}
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    );
  };

  const renderDataPreviewModal = () => {
      if (!previewTableId) return null;
      const table = inputs.find(i => i.id === previewTableId);
      if (!table) return null;

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-12">
              <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-5xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                              <TableProperties size={20} />
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-slate-800">{table.name}</h3>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{table.rows?.length} Records • {table.fields?.length} Fields</p>
                          </div>
                      </div>
                      <button onClick={() => setPreviewTableId(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
                      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                          <table className="w-full text-left border-collapse text-xs">
                              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                  <tr>
                                      <th className="px-4 py-3 font-bold text-slate-400 w-16 text-center bg-slate-50">#</th>
                                      {table.fields?.map(f => (
                                          <th key={f} className="px-6 py-3 font-bold text-slate-600 whitespace-nowrap bg-slate-50">{f}</th>
                                      ))}
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {table.rows?.map((row, idx) => (
                                      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                          <td className="px-4 py-3 text-center font-mono text-slate-300 text-[10px]">{idx + 1}</td>
                                          {table.fields?.map(f => (
                                              <td key={f} className="px-6 py-3 text-slate-700 whitespace-nowrap max-w-[200px] truncate" title={String(row[f])}>{row[f]}</td>
                                          ))}
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  // ... (rest of the component)

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      <aside className="w-[72px] bg-[#0F172A] flex flex-col items-center py-8 gap-8 shrink-0 z-30 shadow-2xl">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30"><Cpu size={20} /></div>
        <nav className="flex flex-col gap-6 w-full px-2">
          {[
             { id: ViewState.DATA_SOURCES, icon: Database, label: '数据' },
             { id: ViewState.LOGIC_STUDIO, icon: Settings2, label: '设计' },
             { id: ViewState.LINEAGE, icon: GitGraph, label: '血缘' },
             { id: ViewState.REPORTS, icon: BarChart3, label: '分析' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id)} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all w-full ${activeView === item.id ? 'bg-white/10 text-indigo-400 shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}>
              <item.icon size={20} />
              <span className="text-[9px] font-bold mt-1.5">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {activeView === ViewState.LINEAGE ? renderLineageView() : 
       activeView === ViewState.REPORTS ? renderReportsView() : 
       activeView === ViewState.DATA_SOURCES ? renderDataSourcesView() : (
      <main className="flex-1 flex flex-col overflow-hidden">
        
        <div className="flex-1 flex overflow-hidden">
          {/* Data Sidebar */}
          <div className="w-72 bg-white border-r border-slate-200 flex flex-col overflow-hidden shrink-0 shadow-sm z-10">
             <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <Database size={12} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">数据源面板</span>
                    </div>
                    {/* Data Source Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input 
                            type="text" 
                            placeholder="搜表或字段..." 
                            value={dataSourceSearch} 
                            onChange={(e) => setDataSourceSearch(e.target.value)} 
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-400 transition-colors" 
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {/* Filtered Inputs with Drag and Drop */}
                    {filteredInputs.map((input, index) => (
                      <div 
                        key={input.id} 
                        className={`border-b border-slate-50 transition-all ${draggedSourceIdx === index ? 'opacity-30' : 'opacity-100'}`}
                        draggable={!dataSourceSearch} // Disable dragging when searching to avoid index mismatch
                        onDragStart={(e) => handleSourceDragStart(e, index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleSourceDrop(e, index)}
                      >
                        <div className="px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors group">
                             {/* Drag Handle */}
                             {!dataSourceSearch && (
                                <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                                    <GripVertical size={12} />
                                </div>
                             )}
                            <div className="flex-1 flex items-center gap-2 cursor-pointer overflow-hidden" onClick={() => toggleTableExpansion(input.id)}>
                                {expandedTables.has(input.id) ? <ChevronDown size={14} className="text-slate-300 shrink-0" /> : <ChevronRight size={14} className="text-slate-300 shrink-0" />}
                                <TableProperties size={12} className="text-indigo-400 shrink-0" />
                                <span className={`text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate ${input.name.toLowerCase().includes(dataSourceSearch.toLowerCase()) && dataSourceSearch ? 'text-indigo-600 bg-indigo-50 px-1 rounded' : ''}`}>{input.name}</span>
                            </div>
                            {/* Preview Eye Icon */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setPreviewTableId(input.id); }}
                                className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                title="预览数据"
                            >
                                <Eye size={12} />
                            </button>
                        </div>
                        {expandedTables.has(input.id) && (
                           <div className="px-2 pb-2 space-y-1 ml-4 border-l-2 border-slate-100 pl-2">
                             {input.fields?.map(f => (
                                 <div key={f} draggable onDragStart={e => handleDragStart(e, f)} onClick={() => insertTextAtCursor(f)} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-transparent hover:border-indigo-100 hover:bg-indigo-50/50 cursor-grab active:cursor-grabbing group">
                                    <div className="w-4 h-4 flex items-center justify-center rounded bg-blue-100 text-blue-600 text-[9px] font-bold shrink-0">#</div>
                                    <span className={`text-xs font-medium text-slate-600 flex-1 truncate ${f.toLowerCase().includes(dataSourceSearch.toLowerCase()) && dataSourceSearch ? 'text-indigo-600 bg-indigo-50' : ''}`}>{f}</span>
                                    <GripVertical size={10} className="text-slate-200 opacity-0 group-hover:opacity-100" />
                                 </div>
                             ))}
                           </div>
                        )}
                      </div>
                    ))}

                    {/* Calculated Metrics Section */}
                    <div className="border-b border-slate-50 mt-4">
                        <div className="px-4 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                           <ChevronDown size={14} className="text-slate-300" />
                           <Sigma size={12} className="text-purple-400" />
                           <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex-1">已定义的计算指标</span>
                        </div>
                        <div className="px-2 pb-2 space-y-1">
                           {computedFormulas.filter((f: any) => f.id !== editingId).map((f: any) => (
                              <div key={f.id} draggable onDragStart={e => handleDragStart(e, f.targetName)} onClick={() => insertTextAtCursor(f.targetName)} className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-purple-50/50 border border-purple-100/50 hover:border-purple-300 cursor-grab transition-all group">
                                 <div className="w-5 h-5 flex items-center justify-center rounded bg-purple-100 text-purple-600 text-[10px] font-bold">ƒ</div>
                                 <div className="flex flex-col gap-0 overflow-hidden flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 truncate">{f.targetName}</span>
                                        {/* Format Icon in List */}
                                        {f.format === 'currency' && <CircleDollarSign size={8} className="text-green-500" />}
                                        {f.format === 'percent' && <Percent size={8} className="text-blue-500" />}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-60">
                                       <Link2 size={8} />
                                       <span className="text-[8px] text-slate-400 font-bold truncate">
                                          {f.dataSource ? `${f.dataSource}[${f.expression.match(/\((.*?)\)/)?.[1] || '*'}]` : '跨表联动'}
                                       </span>
                                    </div>
                                 </div>
                                 <GripVertical size={12} className="text-purple-200 opacity-0 group-hover:opacity-100" />
                              </div>
                           ))}
                        </div>
                    </div>
                </div>
             </div>
             <div className="h-px bg-slate-200 w-full shrink-0"></div>
             <div className="h-[40%] flex flex-col bg-slate-50/30 shrink-0">
                 <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center gap-2 shrink-0"><FunctionSquare size={12} className="text-indigo-500" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">函数库</span></div>
                 <div className="px-3 py-2 border-b border-slate-100 bg-white">
                     <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} /><input type="text" placeholder="搜索公式..." value={functionSearch} onChange={(e) => setFunctionSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none" /></div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                    {BUSINESS_FUNCTIONS.filter(fn => fn.name.toLowerCase().includes(functionSearch.toLowerCase())).map(fn => (
                       <div key={fn.name} draggable onDragStart={e => handleDragStart(e, fn.name)} onClick={() => insertTextAtCursor(`${fn.name}()`)} onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setTooltipPos({ top: rect.top, left: rect.right + 12 }); setHoveredFunc(fn); }} onMouseLeave={() => setHoveredFunc(null)} className="px-3 py-2 bg-white border border-slate-200/60 rounded-md hover:border-indigo-500 cursor-pointer flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-indigo-600 font-mono">{fn.name}</span>
                       </div>
                    ))}
                 </div>
             </div>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar bg-[#F8FAFC] p-6">
               <div className="mb-6 flex-shrink-0">
                  <div className={`relative w-full min-h-[340px] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-all ${isDragOverEditor ? 'ring-2 ring-indigo-500 scale-[1.01]' : ''}`} onDragOver={(e) => { e.preventDefault(); setIsDragOverEditor(true); }} onDragLeave={() => setIsDragOverEditor(false)} onDrop={(e) => { e.preventDefault(); setIsDragOverEditor(false); const t = e.dataTransfer.getData('text/plain'); if(t) insertTextAtCursor(t); }}>
                     {/* Reformatted Card Header */}
                     <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 rounded-t-2xl flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calculator size={14} /> 逻辑定义 Studio</span>
                            <button onClick={() => setIsTemplateLibraryOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"><BookOpen size={12} /> 引用模板</button>
                        </div>
                        
                        <div className="flex items-end gap-6">
                             {/* Name Input */}
                             <div className="flex-1">
                                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><PenLine size={10} /> 指标名称</label>
                                 <input type="text" value={activeFormula?.targetName || ''} onChange={(e) => setFormulas(prev => prev.map(f => f.id === editingId ? {...f, targetName: e.target.value} : f))} className="w-full text-lg font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-indigo-500 focus:ring-0 p-0 pb-1 placeholder:text-slate-300 transition-colors" placeholder="输入指标名称" />
                             </div>
                             
                             {/* Format Selector */}
                             <div>
                                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">数据格式</label>
                                 <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-lg">
                                     <button 
                                        onClick={() => setFormulas(prev => prev.map(f => f.id === editingId ? {...f, format: 'number'} : f))}
                                        className={`p-1.5 rounded-md transition-all ${(!activeFormula?.format || activeFormula.format === 'number') ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                                        title="数值"
                                     >
                                        <Hash size={14} />
                                     </button>
                                     <button 
                                        onClick={() => setFormulas(prev => prev.map(f => f.id === editingId ? {...f, format: 'currency'} : f))}
                                        className={`p-1.5 rounded-md transition-all ${activeFormula?.format === 'currency' ? 'bg-white shadow-sm text-green-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                                        title="金额"
                                     >
                                        <CircleDollarSign size={14} />
                                     </button>
                                     <button 
                                        onClick={() => setFormulas(prev => prev.map(f => f.id === editingId ? {...f, format: 'percent'} : f))}
                                        className={`p-1.5 rounded-md transition-all ${activeFormula?.format === 'percent' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                                        title="百分比"
                                     >
                                        <Percent size={14} />
                                     </button>
                                 </div>
                             </div>
                        </div>

                        {/* Context Bar moved inside */}
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                           <Layers size={14} className="text-indigo-500 mr-1"/>
                           <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider">聚合上下文:</span>
                           <span className="text-xs font-medium">基于</span>
                           <div className="relative inline-block" ref={sourceMenuRef}>
                             <button onClick={() => setIsSourceMenuOpen(!isSourceMenuOpen)} className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 text-xs flex items-center gap-2 hover:border-indigo-300 transition-colors">{activeFormula?.dataSource || '请选择数据源'} <ChevronDown size={10} /></button>
                             {isSourceMenuOpen && (
                               <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-1">
                                 {inputs.filter(i => i.type === 'table').map(t => (
                                   <button key={t.id} onClick={() => { setFormulas(prev => prev.map(f => f.id === editingId ? {...f, dataSource: t.name} : f)); setIsSourceMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 rounded-lg">{t.name}</button>
                                 ))}
                               </div>
                             )}
                           </div>
                           <span className="text-xs font-medium">按维度</span>
                           <div className="relative inline-block" ref={dimensionMenuRef}>
                             <button onClick={() => setIsDimensionMenuOpen(!isDimensionMenuOpen)} className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 text-xs flex items-center gap-2 hover:border-indigo-300 transition-colors">{activeFormula?.groupByField || '请选择维度'} <ChevronDown size={10} /></button>
                             {isDimensionMenuOpen && (
                               <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-1">
                                 {activeFormula?.dataSource ? inputs.find(i => i.name === activeFormula.dataSource)?.fields?.map(field => (
                                   <button key={field} onClick={() => { setFormulas(prev => prev.map(f => f.id === editingId ? {...f, groupByField: field} : f)); setIsDimensionMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 rounded-lg">{field}</button>
                                 )) : <div className="px-3 py-2 text-xs text-slate-400">请先选择数据源</div>}
                               </div>
                             )}
                           </div>
                           <span className="text-xs font-medium">计算</span>
                        </div>
                     </div>

                     <div className="flex-1 flex flex-col p-8 items-center justify-center min-h-[200px]">
                        <textarea ref={editorRef} value={activeFormula?.expression || ''} onChange={(e) => setFormulas(prev => prev.map(f => f.id === editingId ? {...f, expression: e.target.value} : f))} className="w-full text-2xl font-mono text-slate-700 text-center bg-transparent border-none focus:ring-0 resize-none placeholder:text-slate-200 leading-relaxed" placeholder="拖入字段定义计算规则" />
                        <div className="w-full flex items-center gap-4 my-6"><div className="h-px bg-slate-100 flex-1"></div><span className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Mathematical Formula</span><div className="h-px bg-slate-100 flex-1"></div></div>
                        <FormulaRenderer latex={activeFormula?.latex || ''} scale={1.2} />
                     </div>
                  </div>
               </div>
               <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                     <div className="flex gap-2">
                        <button onClick={() => setPreviewTab('result')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${previewTab === 'result' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>核验结果</button>
                        <button onClick={() => setPreviewTab('source')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${previewTab === 'source' ? 'bg-white border border-slate-200 text-slate-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>溯源数据</button>
                     </div>
                  </div>
                  <div className="flex-1 overflow-auto p-6 bg-slate-50/20">{previewTab === 'result' ? renderCalculationResult() : renderSourceTablePreview()}</div>
               </div>
          </div>

          <div className="w-72 bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0 shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">原子计算步骤</h3>
               <button onClick={() => { const id = Date.now().toString(); setFormulas([...formulas, { id, targetName: '新计算步骤', expression: '', latex: '', result: 0, dependencies: [], format: 'number' }]); setEditingId(id); }} className="w-6 h-6 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-md transition-all"><Plus size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
               {computedFormulas.map((f: any, i) => (
                  <div key={f.id} onClick={() => setEditingId(f.id)} className={`p-4 rounded-xl border transition-all cursor-pointer relative ${editingId === f.id ? 'bg-white border-indigo-500 shadow-lg ring-2 ring-indigo-50' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                     <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 block">Step {i+1}</span>
                     <h4 className={`text-sm font-bold truncate ${editingId === f.id ? 'text-indigo-900' : 'text-slate-700'}`}>{f.targetName}</h4>
                     <div className="mt-2 text-[10px] font-mono text-slate-500 bg-slate-50 p-2 rounded truncate border border-slate-100">{f.expression || '未配置逻辑'}</div>
                  </div>
               ))}
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50">
               <button className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                  <Sparkles size={14} /> 发布计算包
               </button>
            </div>
          </div>
        </div>
      </main>
      )}

      {hoveredFunc && (
        <div className="fixed z-[100] w-72 bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 pointer-events-none" style={{ top: Math.min(tooltipPos.top, window.innerHeight - 250), left: tooltipPos.left }}>
           <div className="flex items-center justify-between mb-3">
              <span className="font-black text-sm text-indigo-400 font-mono">{hoveredFunc.name}</span>
              <span className="text-[9px] px-2 py-0.5 bg-slate-800 rounded-full text-slate-400 font-black uppercase">{hoveredFunc.category}</span>
           </div>
           <p className="text-[11px] text-slate-300 mb-5 leading-relaxed font-medium">{hoveredFunc.description}</p>
           <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">示例</div>
           <div className="font-mono text-[10px] text-indigo-300 bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-500/20">{hoveredFunc.example}</div>
        </div>
      )}

      {isTemplateLibraryOpen && <TemplateLibrary onSelect={(t) => {
          const id = Date.now().toString();
          setFormulas([...formulas, { id, targetName: t.name, expression: t.expression, latex: '', result: 0, dependencies: [], format: 'number' }]);
          setEditingId(id);
          setIsTemplateLibraryOpen(false);
      }} onClose={() => setIsTemplateLibraryOpen(false)} />}
      
      {renderDataPreviewModal()}
      
      <style>{`::selection { background: #6366f1; color: white; }`}</style>
    </div>
  );
};

export default App;