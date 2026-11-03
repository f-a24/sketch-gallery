import { describe, expect, test } from 'bun:test';
import { bindingParams, mergeArgs } from './args.ts';

describe('bindingParams', () => {
  test('number with range', () => {
    expect(bindingParams('fov', 50, { min: 10, max: 120 })).toEqual({
      label: 'Fov',
      min: 10,
      max: 120,
    });
  });

  test('hex string becomes a color picker', () => {
    expect(bindingParams('lineColor', '#ffb45a')).toEqual({ label: 'Line Color', view: 'color' });
    expect(bindingParams('name', 'hello')).toEqual({ label: 'Name' });
  });

  test('options array and record', () => {
    expect(bindingParams('mode', 'a', { options: ['a', 'b'] })).toEqual({
      label: 'Mode',
      options: [
        { text: 'a', value: 'a' },
        { text: 'b', value: 'b' },
      ],
    });
    expect(bindingParams('mode', 1, { options: { Low: 1, High: 2 }, label: 'Quality' })).toEqual({
      label: 'Quality',
      options: { Low: 1, High: 2 },
    });
  });

  test('hidden and unsupported values', () => {
    expect(bindingParams('seed', 1, { control: false })).toBeNull();
    expect(bindingParams('fn', () => {})).toBeNull();
  });
});

describe('mergeArgs', () => {
  test('keeps previous values when key and type match', () => {
    expect(mergeArgs({ a: 1, b: 'x', c: true }, { a: 5, b: 2, d: 9 })).toEqual({
      a: 5,
      b: 'x',
      c: true,
    });
  });
});
