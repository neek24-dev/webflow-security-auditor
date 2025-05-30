import { escapeHTML } from './utils.ts';

test('escapeHTML escapes special characters', () => {
  expect(escapeHTML('<script>')).toBe('&lt;script&gt;');
});