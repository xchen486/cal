export interface FormulaTemplate {
  id: string;
  name: string;
  category: 'Financial' | 'HR' | 'Sales' | 'Generic';
  expression: string;
  description: string;
}

export const FORMULA_TEMPLATES: FormulaTemplate[] = [
  {
    id: 't1',
    name: 'Gross Profit',
    category: 'Financial',
    expression: 'Revenue - COGS',
    description: 'Calculates the profit remaining after deducting cost of goods sold.'
  },
  {
    id: 't2',
    name: 'Net Income',
    category: 'Financial',
    expression: 'Revenue - Expenses - Taxes',
    description: 'The final profit after all costs and taxes are subtracted.'
  },
  {
    id: 't3',
    name: 'ROI',
    category: 'Financial',
    expression: '(Gain - Cost) / Cost',
    description: 'Return on Investment calculation.'
  },
  {
    id: 't4',
    name: 'Compa-Ratio',
    category: 'HR',
    expression: 'Salary / Market_Midpoint',
    description: 'Compares an employee\'s salary to the market midpoint for their role.'
  },
  {
    id: 't5',
    name: 'Turnover Rate',
    category: 'HR',
    expression: 'Terminations / Avg_Headcount',
    description: 'Calculates employee turnover over a specific period.'
  },
  {
    id: 't6',
    name: 'Win Rate',
    category: 'Sales',
    expression: 'Closed_Won / Total_Opportunities',
    description: 'The percentage of opportunities that result in a sale.'
  },
  {
    id: 't7',
    name: 'CAC',
    category: 'Sales',
    expression: 'Marketing_Spend / New_Customers',
    description: 'Customer Acquisition Cost.'
  },
  {
    id: 't8',
    name: 'Compound Interest',
    category: 'Generic',
    expression: 'P * (1 + r)^n',
    description: 'Calculates future value with compounded returns.'
  }
];