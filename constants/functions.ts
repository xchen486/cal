
export interface BusinessFunction {
  name: string;
  displayName: string;
  syntax: string;
  description: string;
  example: string;
  category: '基础' | '聚合' | '逻辑';
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
    name: 'SUM_BY',
    displayName: '分组求和',
    syntax: 'SUM_BY(field, BY=dimension)',
    description: 'Calculates the sum of a field, grouped by a specified dimension.',
    example: 'SUM_BY(金额, BY=员工编号)',
    category: '聚合'
  },
  {
    name: 'DOMINANT_KEY',
    displayName: '主导维度提取',
    syntax: 'DOMINANT_KEY(目标维度, WEIGHT=权重字段)',
    description: '在明细数据中，找出权重占比最高的那个维度值。若权重设为 COUNT，则找出出现次数最多的维度值。',
    example: 'DOMINANT_KEY(城市, WEIGHT=金额)',
    category: '聚合'
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