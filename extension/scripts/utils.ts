// src/scripts/utils.ts
export function debounce(func: (...args: any[]) => void, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return function (...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function escapeHTML(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// src/scripts/utils.test.js
import { escapeHTML } from './utils.ts';

test('escapeHTML escapes special characters', () => {
  expect(escapeHTML('<script>')).toBe('&lt;script&gt;');
});