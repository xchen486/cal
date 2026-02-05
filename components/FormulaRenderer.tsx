import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface FormulaRendererProps {
  latex: string;
  displayMode?: boolean;
  scale?: number;
}

export const FormulaRenderer: React.FC<FormulaRendererProps> = ({ latex, displayMode = false, scale = 1 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!latex) {
      containerRef.current.innerHTML = '';
      return;
    }

    try {
      // 使用 renderToString 绕过 quirks mode 检测
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode,
        trust: true,
        strict: false
      });
      
      containerRef.current.innerHTML = html;
      
      // 处理缩放
      if (scale !== 1) {
        containerRef.current.style.transform = `scale(${scale})`;
        containerRef.current.style.transformOrigin = 'center';
        containerRef.current.style.display = 'inline-block';
      } else {
        containerRef.current.style.transform = 'none';
        containerRef.current.style.display = 'block';
      }
    } catch (err) {
      console.error("KaTeX rendering error:", err);
      containerRef.current.textContent = latex;
      containerRef.current.style.color = '#ef4444'; // text-red-500
      containerRef.current.style.fontSize = '12px';
      containerRef.current.style.fontFamily = 'monospace';
    }
  }, [latex, displayMode, scale]);

  return (
    <div 
      ref={containerRef} 
      className="overflow-x-visible py-2 min-h-[1.5em] flex items-center justify-center transition-all duration-300"
    />
  );
};