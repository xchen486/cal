
export interface BusinessFunction {
  name: string;
  displayName: string;
  syntax: string;
  description: string;
  example: string;
  category: '基础' | '聚合' | '逻辑' | '关联';
}

export const BUSINESS_FUNCTIONS: BusinessFunction[] = [
  {
    name: 'SUM',
    displayName: '求和',
    syntax: 'SUM(字段)',
    description: '计算指定字段所有数值的总和。',
    example: 'SUM(奖金金额)',
    category: '基础'
  },
  {
    name: 'AVG',
    displayName: '平均值',
    syntax: 'AVG(字段)',
    description: '计算指定字段所有数值的平均数。',
    example: 'AVG(基本薪资)',
    category: '基础'
  },
  {
    name: 'COUNT',
    displayName: '计数',
    syntax: 'COUNT(字段)',
    description: '计算数据的条目总数。',
    example: 'COUNT(员工编号)',
    category: '基础'
  },
  {
    name: 'SUM_GROUP',
    displayName: '分组求和',
    syntax: 'SUM_GROUP(指标, BY=维度)',
    description: '按指定维度分组求和，并将结果广播回每一行（窗口函数模式）。',
    example: 'SUM_GROUP(本单分成, BY=员工)',
    category: '聚合'
  },
  {
    name: 'LOOKUP',
    displayName: '跨表引用',
    syntax: 'LOOKUP(表名, 字段名)',
    description: '根据自动检测的关联键（如城市、ID），从另一张表中匹配并引用数据。',
    example: 'LOOKUP(城市基础档案, 保险系数)',
    category: '关联'
  },
  {
    name: 'RANK',
    displayName: '组内排名',
    syntax: 'RANK(指标, BY=维度)',
    description: '计算某个指标在指定维度（如城市、部门）内的排名（从高到低）。',
    example: 'RANK(个人总业绩, BY=城市)',
    category: '聚合'
  },
  {
    name: 'IF',
    displayName: '条件判断',
    syntax: 'IF(条件, 结果A, 结果B)',
    description: '如果满足某个条件，则返回结果A，否则返回结果B。',
    example: 'IF(业绩 > 10000, 500, 0)',
    category: '逻辑'
  }
];