
import { DataVariable, FormulaBlock } from '../types.ts';
import { DimensionEngine } from './DimensionEngine.ts';
import { GoogleGenAI } from "@google/genai";

export class FormulaParser {
  static async suggestFormula(prompt: string, contextVariables: DataVariable[]): Promise<{expression: string, explanation: string}> {
    // Correctly initialize GoogleGenAI with API key from environment
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const varNames = contextVariables.map(v => v.name).join(', ');
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate this natural language request into a mathematical formula using ONLY the available variables: [${varNames}].
        Request: "${prompt}"
        Rules: 
        1. Use standard operators (+, -, *, /) or AGGREGATE(table, OP, field, BY=key).
        2. Return ONLY a JSON object with "expression" and "explanation".
        3. Do not include units.`,
        config: {
          responseMimeType: "application/json"
        }
      });
      // Correctly access text property (not method) and trim whitespace
      const text = response.text?.trim();
      return JSON.parse(text || '{}');
    } catch (e) {
      console.error("AI Suggestion failed", e);
      return { expression: '', explanation: 'AI Suggestion unavailable' };
    }
  }

  static evaluate(
    expression: string,
    context: DataVariable[]
  ): { result: any; dependencies: string[]; latex: string } {
    if (!expression || expression.trim() === '') {
      return { result: 0, dependencies: [], latex: '' };
    }

    // 优化：更广泛地匹配变量名（包括中文）
    const ctxMap = new Map<string, any>();
    context.forEach(v => ctxMap.set(v.name, v.value));
    
    // 找出所有在表达式中出现的变量名
    const dependencies = context
      .map(v => v.name)
      .filter(name => expression.includes(name));

    let result: any = 0;
    
    try {
      // 基础聚合处理
      if (expression.includes('SUM(')) {
          const varName = expression.match(/SUM\((.*?)\)/)?.[1]?.trim();
          const val = ctxMap.get(varName || '');
          result = Array.isArray(val) ? val.reduce((a,b) => (parseFloat(a)+parseFloat(b)), 0) : val;
      } 
      // 基础运算处理
      else if (expression.includes('*') || expression.includes('+') || expression.includes('-') || expression.includes('/')) {
          let evalExpr = expression;
          // 按长度排序防止子串覆盖
          const sortedDeps = [...dependencies].sort((a,b) => b.length - a.length);
          sortedDeps.forEach(dep => {
             const val = ctxMap.get(dep);
             // 如果是数组，我们记录下这是一个矢量运算，稍后由 DimensionEngine 处理
             if (!Array.isArray(val)) {
                evalExpr = evalExpr.split(dep).join(val.toString());
             }
          });

          // 如果存在数组变量，利用 DimensionEngine 处理
          const arrayDep = dependencies.find(d => Array.isArray(ctxMap.get(d)));
          if (arrayDep) {
             const baseArray = ctxMap.get(arrayDep) as number[];
             // 简单的跨维度操作支持
             if (expression.includes('*')) {
                const parts = expression.split('*');
                const p1 = ctxMap.get(parts[0].trim());
                const p2 = ctxMap.get(parts[1].trim()) || parseFloat(parts[1].trim());
                result = DimensionEngine.operate(p1, p2, (x, y) => x * y);
             } else if (expression.includes('+')) {
                const parts = expression.split('+');
                const p1 = ctxMap.get(parts[0].trim());
                const p2 = ctxMap.get(parts[1].trim()) || parseFloat(parts[1].trim());
                result = DimensionEngine.operate(p1, p2, (x, y) => x + y);
             }
          } else {
             result = eval(evalExpr);
          }
      } else {
          result = ctxMap.get(expression.trim()) || 0;
      }
    } catch (e) {
      console.error("Eval error", e);
    }

    let latex = expression
      .replace(/\*/g, '\\times')
      .replace(/\//g, '\\div')
      .replace(/([a-zA-Z_]\w*)/g, (m) => `\\text{${m}}`);

    return { result, dependencies, latex };
  }
}