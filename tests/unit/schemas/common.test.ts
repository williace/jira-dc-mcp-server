import { z } from 'zod';
import {
  PaginationSchema,
  ResponseFormatSchema,
  IssueIdOrKeySchema,
  BoardIdSchema,
  SprintIdSchema,
} from '../../../src/schemas/common.js';

describe('PaginationSchema', () => {
  // PaginationSchema is a plain object with startAt and maxResults fields,
  // so we wrap it in z.object() to test parsing.
  const schema = z.object({ ...PaginationSchema });

  it('applies defaults when no values are provided', () => {
    const result = schema.parse({});
    expect(result.startAt).toBe(0);
    expect(result.maxResults).toBe(50);
  });

  it('accepts valid pagination values', () => {
    const result = schema.parse({ startAt: 10, maxResults: 25 });
    expect(result.startAt).toBe(10);
    expect(result.maxResults).toBe(25);
  });

  it('rejects negative startAt', () => {
    expect(() => schema.parse({ startAt: -1 })).toThrow();
  });

  it('rejects maxResults greater than 100', () => {
    expect(() => schema.parse({ maxResults: 101 })).toThrow();
  });

  it('rejects maxResults of 0', () => {
    expect(() => schema.parse({ maxResults: 0 })).toThrow();
  });

  it('rejects non-integer startAt', () => {
    expect(() => schema.parse({ startAt: 1.5 })).toThrow();
  });
});

describe('ResponseFormatSchema', () => {
  it('accepts "markdown"', () => {
    expect(ResponseFormatSchema.parse('markdown')).toBe('markdown');
  });

  it('accepts "json"', () => {
    expect(ResponseFormatSchema.parse('json')).toBe('json');
  });

  it('defaults to "markdown" when undefined', () => {
    expect(ResponseFormatSchema.parse(undefined)).toBe('markdown');
  });

  it('rejects invalid format strings', () => {
    expect(() => ResponseFormatSchema.parse('xml')).toThrow();
    expect(() => ResponseFormatSchema.parse('html')).toThrow();
  });
});

describe('IssueIdOrKeySchema', () => {
  it('accepts a valid issue key like "PROJ-123"', () => {
    expect(IssueIdOrKeySchema.parse('PROJ-123')).toBe('PROJ-123');
  });

  it('accepts a numeric string ID', () => {
    expect(IssueIdOrKeySchema.parse('10001')).toBe('10001');
  });

  it('rejects an empty string', () => {
    expect(() => IssueIdOrKeySchema.parse('')).toThrow();
  });
});

describe('BoardIdSchema', () => {
  it('accepts a positive integer', () => {
    expect(BoardIdSchema.parse(42)).toBe(42);
  });

  it('rejects 0', () => {
    expect(() => BoardIdSchema.parse(0)).toThrow();
  });

  it('rejects negative numbers', () => {
    expect(() => BoardIdSchema.parse(-1)).toThrow();
  });

  it('rejects floats', () => {
    expect(() => BoardIdSchema.parse(1.5)).toThrow();
  });
});

describe('SprintIdSchema', () => {
  it('accepts a positive integer', () => {
    expect(SprintIdSchema.parse(100)).toBe(100);
  });

  it('rejects 0', () => {
    expect(() => SprintIdSchema.parse(0)).toThrow();
  });

  it('rejects negative numbers', () => {
    expect(() => SprintIdSchema.parse(-5)).toThrow();
  });

  it('rejects floats', () => {
    expect(() => SprintIdSchema.parse(3.14)).toThrow();
  });
});
