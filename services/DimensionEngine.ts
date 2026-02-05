import { DataVariable } from '../types.ts';

export class DimensionEngine {
  static broadcast(val: number | number[], length: number): number[] {
    if (Array.isArray(val)) {
      if (val.length === length) return val;
      return val.slice(0, length);
    }
    return Array(length).fill(val);
  }

  static operate(
    a: number | number[],
    b: number | number[],
    op: (x: number, y: number) => number
  ): number | number[] {
    const isArrayA = Array.isArray(a);
    const isArrayB = Array.isArray(b);

    if (!isArrayA && !isArrayB) {
      return op(a as number, b as number);
    }

    const length = isArrayA ? (a as number[]).length : (b as number[]).length;
    const arrA = this.broadcast(a, length);
    const arrB = this.broadcast(b, length);

    return arrA.map((val, idx) => op(val, arrB[idx]));
  }

  static aggregate(arr: number[], type: 'sum' | 'avg' | 'count'): number {
    switch (type) {
      case 'sum': return arr.reduce((s, v) => s + v, 0);
      case 'avg': return arr.reduce((s, v) => s + v, 0) / arr.length;
      case 'count': return arr.length;
    }
  }
}