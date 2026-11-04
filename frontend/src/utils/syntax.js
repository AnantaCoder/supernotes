/**
 * Lightweight, high-performance syntax highlighter & tokenizer for Canvas 2D
 */

export const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', ext: '.js' },
  { id: 'typescript', name: 'TypeScript', ext: '.ts' },
  { id: 'python', name: 'Python', ext: '.py' },
  { id: 'sql', name: 'SQL', ext: '.sql' },
  { id: 'html', name: 'HTML', ext: '.html' },
  { id: 'css', name: 'CSS', ext: '.css' },
  { id: 'json', name: 'JSON', ext: '.json' },
  { id: 'java', name: 'Java', ext: '.java' },
  { id: 'cpp', name: 'C / C++', ext: '.cpp' },
  { id: 'go', name: 'Go', ext: '.go' },
  { id: 'rust', name: 'Rust', ext: '.rs' },
  { id: 'shell', name: 'Shell / Bash', ext: '.sh' }
];

export const LANGUAGE_DISPLAY_NAMES = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  python: 'Python',
  py: 'Python',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  rust: 'Rust',
  rs: 'Rust',
  shell: 'Bash / Shell',
  sh: 'Bash',
  bash: 'Bash'
};

export function getLanguageName(id) {
  if (!id) return 'Code';
  if (typeof id === 'object') {
    return id.name || getLanguageName(id.id) || 'Code';
  }
  const str = String(id);
  const clean = str.toLowerCase().trim();
  return LANGUAGE_DISPLAY_NAMES[clean] || (str.charAt(0).toUpperCase() + str.slice(1));
}

export function detectLanguage(code) {
  if (!code) return 'javascript';
  const trimmed = code.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch (_) {}
  }
  if (/^\s*<!DOCTYPE|^\s*<html|^\s*<\w+[^>]*>/i.test(trimmed)) return 'html';
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+/i.test(trimmed)) return 'sql';
  if (/^\s*(def |class .*:|import numpy|import pandas|from .* import|elif |if __name__ ==)/m.test(trimmed)) return 'python';
  if (/^\s*(package |func |import \(|go func)/m.test(trimmed)) return 'go';
  if (/^\s*(fn main|pub fn|impl |use std::|let mut )/m.test(trimmed)) return 'rust';
  if (/^\s*(public class|private void|System\.out\.println)/m.test(trimmed)) return 'java';
  if (/^\s*(#include <|std::cout|int main\()/m.test(trimmed)) return 'cpp';
  if (/^\s*([.#]\w+[\s\S]*\{[\s\S]*\}|@media|@keyframes)/m.test(trimmed)) return 'css';
  if (/^\s*(#!\/bin\/bash|echo |sudo |apt-get|brew |npm run)/m.test(trimmed)) return 'shell';
  if (/:\s*(string|number|boolean|any|void)\b|<[A-Z]\w*>|\binterface\s+\w+|\btype\s+\w+\s*=/m.test(trimmed)) return 'typescript';
  return 'javascript';
}

const JS_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class',
  'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'finally',
  'throw', 'new', 'typeof', 'instanceof', 'switch', 'case', 'break', 'continue',
  'yield', 'this', 'super', 'interface', 'type', 'extends', 'implements', 'enum', 'as'
]);

const PYTHON_KEYWORDS = new Set([
  'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except',
  'finally', 'raise', 'import', 'from', 'as', 'with', 'pass', 'lambda', 'yield',
  'assert', 'global', 'nonlocal', 'del', 'in', 'is', 'not', 'and', 'or', 'self'
]);

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'SET', 'DELETE', 'JOIN',
  'INNER', 'LEFT', 'RIGHT', 'OUTER', 'CROSS', 'ON', 'GROUP', 'BY', 'ORDER',
  'HAVING', 'LIMIT', 'OFFSET', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'DATABASE', 'VIEW', 'DISTINCT',
  'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'IS', 'NULL', 'UNION', 'ALL',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'VALUES', 'ASC', 'DESC'
]);

const JAVA_CPP_KEYWORDS = new Set([
  'public', 'private', 'protected', 'class', 'interface', 'static', 'final', 'void',
  'int', 'float', 'double', 'boolean', 'char', 'long', 'short', 'byte', 'return',
  'new', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package', 'struct',
  'template', 'typename', 'const', 'auto', 'include', 'namespace', 'using', 'std'
]);

const GO_KEYWORDS = new Set([
  'func', 'package', 'import', 'return', 'var', 'const', 'type', 'struct', 'interface',
  'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'select', 'go', 'defer',
  'chan', 'map', 'make', 'new', 'len', 'cap', 'append'
]);

const RUST_KEYWORDS = new Set([
  'fn', 'let', 'mut', 'pub', 'struct', 'enum', 'impl', 'trait', 'use', 'mod',
  'match', 'if', 'else', 'for', 'while', 'loop', 'return', 'break', 'continue',
  'move', 'ref', 'self', 'Self', 'async', 'await', 'where', 'crate', 'super'
]);

const SHELL_KEYWORDS = new Set([
  'if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done', 'while', 'case',
  'esac', 'function', 'return', 'exit', 'echo', 'export', 'local', 'source', 'sudo'
]);

const LITERALS = new Set([
  'true', 'false', 'null', 'undefined', 'True', 'False', 'None', 'nil', 'NaN', 'Infinity'
]);

// High-contrast, modern VS Code / One Dark inspired theme
export const CODE_THEME = {
  bg: '#181824',
  headerBg: '#12121c',
  gutterBg: '#141420',
  gutterText: '#4b5263',
  border: '#282c34',
  keyword: '#c678dd',   // vibrant purple / magenta
  string: '#98c379',    // soft modern green
  number: '#d19a66',    // warm amber
  boolean: '#d19a66',   // warm amber
  function: '#61afef',  // electric blue
  type: '#e5c07b',      // warm yellow
  comment: '#707886',   // clean muted grey
  operator: '#56b6c2',  // cyan / aqua
  property: '#e06c75',  // coral
  tag: '#e06c75',       // coral
  attribute: '#d19a66', // warm amber
  plain: '#abb2bf'      // crisp light grey
};

// ─── Tokenization Cache ─────────────────────────────────────────────────
// Avoids re-tokenizing the same (code, language) pair on every render frame.
// The cache is keyed by "lang\0code" and stores the tokenized result.
// It uses true LRU eviction: when full, only the oldest accessed item is dropped.
const _tokenCache = new Map();
const _TOKEN_CACHE_MAX = 256;

/**
 * Tokenizes a code string line-by-line for fast Canvas rendering.
 * Results are cached so repeated calls with the same code+language are O(1).
 */
export function tokenizeCode(code = '', language = 'javascript') {
  const safeCode = typeof code === 'string' ? code : (code != null ? String(code) : '');
  const safeLang = typeof language === 'string'
    ? language
    : (typeof language === 'object' && language ? (language.id || language.name || 'javascript') : 'javascript');
  const cacheKey = safeLang + '\0' + safeCode;
  if (_tokenCache.has(cacheKey)) {
    const cached = _tokenCache.get(cacheKey);
    // Refresh LRU order: delete and re-insert so it remains most recently used
    _tokenCache.delete(cacheKey);
    _tokenCache.set(cacheKey, cached);
    return cached;
  }

  const lang = safeLang.toLowerCase();
  const rawLines = safeCode.split('\n');
  const tokenizedLines = [];

  let inBlockComment = false;

  for (let l = 0; l < rawLines.length; l++) {
    const line = rawLines[l];
    const tokens = [];
    let i = 0;
    const len = line.length;

    if (len === 0) {
      tokenizedLines.push([]);
      continue;
    }

    while (i < len) {
      // 1. Multi-line comment state
      if (inBlockComment) {
        const endIdx = line.indexOf('*/', i);
        if (endIdx !== -1) {
          tokens.push({ text: line.slice(i, endIdx + 2), type: 'comment' });
          i = endIdx + 2;
          inBlockComment = false;
        } else {
          tokens.push({ text: line.slice(i), type: 'comment' });
          i = len;
        }
        continue;
      }

      // Check block comment start
      if (line.slice(i, i + 2) === '/*') {
        const endIdx = line.indexOf('*/', i + 2);
        if (endIdx !== -1) {
          tokens.push({ text: line.slice(i, endIdx + 2), type: 'comment' });
          i = endIdx + 2;
        } else {
          tokens.push({ text: line.slice(i), type: 'comment' });
          inBlockComment = true;
          i = len;
        }
        continue;
      }

      // HTML comment
      if (lang === 'html' && line.slice(i, i + 4) === '<!--') {
        const endIdx = line.indexOf('-->', i + 4);
        if (endIdx !== -1) {
          tokens.push({ text: line.slice(i, endIdx + 3), type: 'comment' });
          i = endIdx + 3;
        } else {
          tokens.push({ text: line.slice(i), type: 'comment' });
          i = len;
        }
        continue;
      }

      // Single line comments: //, #, --
      if (line.slice(i, i + 2) === '//' && lang !== 'python' && lang !== 'shell') {
        tokens.push({ text: line.slice(i), type: 'comment' });
        break;
      }
      if ((lang === 'python' || lang === 'shell') && line[i] === '#') {
        tokens.push({ text: line.slice(i), type: 'comment' });
        break;
      }
      if (lang === 'sql' && line.slice(i, i + 2) === '--') {
        tokens.push({ text: line.slice(i), type: 'comment' });
        break;
      }

      // 2. Strings: ", ', `
      const char = line[i];
      if (char === '"' || char === "'" || char === '`') {
        let j = i + 1;
        while (j < len) {
          if (line[j] === '\\') {
            j += 2;
            continue;
          }
          if (line[j] === char) {
            j++;
            break;
          }
          j++;
        }
        const strText = line.slice(i, j);
        tokens.push({ text: strText, type: 'string' });
        i = j;
        continue;
      }

      // 3. Numbers: 123, 0.45, 0x12, etc.
      if (/\d/.test(char) && (i === 0 || /[\s,([{:+\-*\/=<>&|!]/.test(line[i - 1]))) {
        let j = i;
        while (j < len && /[\d.xXa-fA-F_]/.test(line[j])) {
          j++;
        }
        tokens.push({ text: line.slice(i, j), type: 'number' });
        i = j;
        continue;
      }

      // 4. HTML Tags & Attributes
      if (lang === 'html') {
        if (line.slice(i, i + 2) === '</') {
          let j = line.indexOf('>', i);
          if (j === -1) j = len; else j++;
          tokens.push({ text: line.slice(i, j), type: 'tag' });
          i = j;
          continue;
        }
        if (line[i] === '<' && /[a-zA-Z!]/.test(line[i + 1])) {
          let j = i + 1;
          while (j < len && /[a-zA-Z0-9-]/.test(line[j])) j++;
          tokens.push({ text: line.slice(i, j), type: 'tag' });
          i = j;
          continue;
        }
      }

      // 5. Words / Identifiers / Keywords
      if (/[a-zA-Z_$]/.test(char)) {
        let j = i;
        while (j < len && /[a-zA-Z0-9_$]/.test(line[j])) {
          j++;
        }
        const word = line.slice(i, j);
        const upperWord = word.toUpperCase();

        // Check language keywords
        let isKw = false;
        if (lang === 'python') isKw = PYTHON_KEYWORDS.has(word);
        else if (lang === 'sql') isKw = SQL_KEYWORDS.has(upperWord);
        else if (lang === 'java' || lang === 'cpp' || lang === 'c') isKw = JAVA_CPP_KEYWORDS.has(word);
        else if (lang === 'go') isKw = GO_KEYWORDS.has(word);
        else if (lang === 'rust') isKw = RUST_KEYWORDS.has(word);
        else if (lang === 'shell') isKw = SHELL_KEYWORDS.has(word);
        else isKw = JS_KEYWORDS.has(word);

        if (isKw) {
          tokens.push({ text: word, type: 'keyword' });
        } else if (LITERALS.has(word)) {
          tokens.push({ text: word, type: 'boolean' });
        } else if (line[j] === '(') {
          // Function call
          tokens.push({ text: word, type: 'function' });
        } else if (/^[A-Z][a-zA-Z0-9]*$/.test(word) && lang !== 'sql') {
          // Type or Class name
          tokens.push({ text: word, type: 'type' });
        } else {
          tokens.push({ text: word, type: 'plain' });
        }

        i = j;
        continue;
      }

      // 6. Whitespace (preserve exact spacing/tabs)
      if (/\s/.test(char)) {
        let j = i;
        while (j < len && /\s/.test(line[j])) {
          j++;
        }
        tokens.push({ text: line.slice(i, j), type: 'plain' });
        i = j;
        continue;
      }

      // 7. Operators & Punctuation
      if (/[=+\-*\/%&|^!<>?:~]/.test(char)) {
        let j = i;
        while (j < len && /[=+\-*\/%&|^!<>?:~]/.test(line[j])) {
          j++;
        }
        tokens.push({ text: line.slice(i, j), type: 'operator' });
        i = j;
        continue;
      }

      // Single characters (brackets, dots, semicolons, commas)
      tokens.push({ text: char, type: 'plain' });
      i++;
    }

    tokenizedLines.push(tokens);
  }

  // Store in cache with LRU eviction: if full, evict only the oldest entry
  if (_tokenCache.size >= _TOKEN_CACHE_MAX) {
    const oldestKey = _tokenCache.keys().next().value;
    if (oldestKey !== undefined) _tokenCache.delete(oldestKey);
  }
  _tokenCache.set(cacheKey, tokenizedLines);

  return tokenizedLines;
}

