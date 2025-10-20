"use client";

import React, { useEffect, useRef, useMemo } from "react";

interface CodeHighlighterProps {
  code: string;
  highlightedSections?: string[];
  flashSection?: string | null;
  className?: string;
}

const SOLIDITY_KEYWORDS = [
  'pragma', 'solidity', 'contract', 'function', 'modifier', 'event', 'struct', 'enum',
  'mapping', 'address', 'uint256', 'uint8', 'bool', 'string', 'bytes32', 'memory',
  'public', 'private', 'internal', 'external', 'view', 'pure', 'payable', 'constant',
  'returns', 'return', 'if', 'else', 'for', 'while', 'require', 'import', 'constructor',
  'override', 'virtual', 'abstract', 'interface', 'library', 'using', 'is', 'super'
];

const SOLIDITY_TYPES = [
  'address', 'bool', 'string', 'bytes', 'uint', 'int', 'fixed', 'ufixed',
  'uint8', 'uint16', 'uint32', 'uint64', 'uint128', 'uint256',
  'int8', 'int16', 'int32', 'int64', 'int128', 'int256',
  'bytes1', 'bytes2', 'bytes4', 'bytes8', 'bytes16', 'bytes32'
];

const SOLIDITY_CONSTANTS = ['true', 'false', 'null', 'undefined', 'this', 'super'];

const HighlightedSpan: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = "",
  children
}) => <span className={className}>{children}</span>;

// Process individual segment for syntax highlighting
const processSegment = (segment: string): React.ReactNode => {
  // Check if it's a comment
  if (segment.startsWith('//') || (segment.startsWith('/*') && segment.endsWith('*/'))) {
    return <HighlightedSpan className="text-green-500 italic">{segment}</HighlightedSpan>;
  }

  // Check if it's a string
  if ((segment.startsWith('"') && segment.endsWith('"')) ||
      (segment.startsWith("'") && segment.endsWith("'"))) {
    return <HighlightedSpan className="text-yellow-400">{segment}</HighlightedSpan>;
  }

  // Check if it's a number
  if (/^\d+(\.\d+)?$/.test(segment)) {
    return <HighlightedSpan className="text-purple-400">{segment}</HighlightedSpan>;
  }

  // Check if it's a keyword
  if (SOLIDITY_KEYWORDS.includes(segment)) {
    return <HighlightedSpan className="text-blue-400 font-semibold">{segment}</HighlightedSpan>;
  }

  // Check if it's a type
  if (SOLIDITY_TYPES.includes(segment)) {
    return <HighlightedSpan className="text-cyan-400 font-medium">{segment}</HighlightedSpan>;
  }

  // Check if it's a constant
  if (SOLIDITY_CONSTANTS.includes(segment)) {
    return <HighlightedSpan className="text-orange-400">{segment}</HighlightedSpan>;
  }

  return segment;
};

// Process syntax highlighting for a single line
const processLineSyntax = (line: string): React.ReactNode => {
  // Split by common delimiters and process
  const words = line.split(/(\s+|[{}();,\[\]()]|\/\/.*$|\/\*[\s\S]*?\*\/|"[^"\\]*"|'[^'\\']*'|\b\d+(\.\d+)?\b)/gm);

  return words.map((word, index) => {
    if (!word || word.trim() === '') return word;
    return <span key={index}>{processSegment(word)}</span>;
  });
};

export function CodeHighlighter({ code, highlightedSections = [], flashSection = null, className = "" }: CodeHighlighterProps) {
  const codeRef = useRef<HTMLDivElement>(null);

  const processedLines = useMemo(() => {
    const lines = code.split('\n');

    return lines.map((line, lineIndex) => {
      let lineClassName = '';
      let shouldFlash = false;
      let shouldHighlight = false;

      // Check if line contains flash section
      if (flashSection && line.includes(flashSection)) {
        shouldFlash = true;
        lineClassName = 'flash-line';
      }
      // Check if line contains any highlighted section
      else if (highlightedSections.some(section => line.includes(section))) {
        shouldHighlight = true;
        lineClassName = 'highlight-line';
      }

      // Process syntax highlighting for the line
      const processedTokens = processLineSyntax(line);

      return (
        <div
          key={lineIndex}
          className={`code-line ${lineClassName}`}
          data-line-number={lineIndex + 1}
        >
          {processedTokens}
        </div>
      );
    });
  }, [code, highlightedSections, flashSection]);

  // Auto-scroll to flash sections (higher priority) or highlighted sections
  useEffect(() => {
    if (codeRef.current) {
      let targetElement: Element | null = null;

      // Prioritize flash section
      if (flashSection) {
        targetElement = codeRef.current.querySelector('.flash-line');
      } else if (highlightedSections.length > 0) {
        targetElement = codeRef.current.querySelector('.highlight-line');
      }

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [highlightedSections, flashSection]);

  return (
    <div ref={codeRef} className={className}>
      <style jsx>{`
        .flash-line {
          background: linear-gradient(90deg, rgba(253, 224, 71, 0.5), rgba(251, 191, 36, 0.3));
          border-left: 4px solid #f59e0b;
          padding-left: 8px;
          margin-left: -8px;
          animation: flashPulse 2s ease-in-out;
          border-radius: 4px;
        }

        .highlight-line {
          background-color: rgba(253, 224, 71, 0.2);
          border-left: 3px solid #eab308;
          padding-left: 6px;
          margin-left: -6px;
          animation: pulse 3s ease-in-out;
          border-radius: 2px;
        }

        @keyframes flashPulse {
          0%, 100% {
            background: linear-gradient(90deg, rgba(253, 224, 71, 0.8), rgba(251, 191, 36, 0.6));
            transform: scale(1.02);
          }
          50% {
            background: linear-gradient(90deg, rgba(253, 224, 71, 0.4), rgba(251, 191, 36, 0.2));
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% { background-color: rgba(253, 224, 71, 0.3); }
          50% { background-color: rgba(253, 224, 71, 0.1); }
        }
      `}</style>
      <pre className="whitespace-pre-wrap font-mono leading-relaxed text-sm">
        {processedLines}
      </pre>
    </div>
  );
}