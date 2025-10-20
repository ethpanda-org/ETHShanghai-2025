export function extractISchemaContent(code: string) {
    const start = code.indexOf('i.schema(');
    if (start === -1) return null;
  
    let i = start + 'i.schema('.length;
    let depth = 1;
    let content = '';
  
    while (i < code.length && depth > 0) {
      const ch = code[i];
  
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
  
      if (depth > 0) content += ch;
      i++;
    }
  
    return content.trim();
  }