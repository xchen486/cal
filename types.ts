export type DataType = 'scalar' | 'array' | 'table' | 'metric';

export interface Dimension {
  id: string;
  name: string; // e.g., "Department", "Region", "Employee"
  parentDimensionId?: string;
}

export interface DataVariable {
  id: string;
  name: string;
  value: any; // Can be number, number[], or Row[]
  rows?: any[]; // For 'table' type
  type: DataType;
  unit?: string;
  dimensionId?: string;
  source?: string;
  fields?: string[]; // Field names if it's a table
}

export interface FormulaBlock {
  id: string;
  targetName: string;
  expression: string;
  latex: string;
  result: any;
  dependencies: string[];
  explanation?: string;
  dataSource?: string; // e.g., "销售订单明细"
  groupByField?: string; // e.g., "员工编号"
  format?: 'number' | 'currency' | 'percent';
}

export enum ViewState {
  DATA_SOURCES = 'DATA_SOURCES',
  LOGIC_STUDIO = 'LOGIC_STUDIO',
  AUDIT_LAB = 'AUDIT_LAB',
  REPORTS = 'REPORTS',
  LINEAGE = 'LINEAGE'
}