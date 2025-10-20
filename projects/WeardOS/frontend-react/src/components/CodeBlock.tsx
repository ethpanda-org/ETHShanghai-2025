import React, { useState } from 'react';
import './CodeBlock.scss';

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'text' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <div className="language-label">{language}</div>
        <button
          onClick={handleCopy}
          className="copy-button"
          title={copied ? '已复制' : '复制代码'}
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path 
                d="M20 6L9 17L4 12" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect 
                x="9" y="9" width="13" height="13" rx="2" ry="2" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none"
              />
              <path 
                d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none"
              />
            </svg>
          )}
        </button>
      </div>
      <pre className="code-content">
        <code className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;