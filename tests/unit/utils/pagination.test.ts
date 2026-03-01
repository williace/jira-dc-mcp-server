import { buildPaginationMeta, formatPaginationFooter } from '../../../src/utils/pagination.js';

describe('buildPaginationMeta', () => {
  it('computes middle page correctly', () => {
    const meta = buildPaginationMeta(50, 50, 200);

    expect(meta.startAt).toBe(50);
    expect(meta.maxResults).toBe(50);
    expect(meta.total).toBe(200);
    expect(meta.isLastPage).toBe(false);
    expect(meta.nextStartAt).toBe(100);
  });

  it('computes last page correctly', () => {
    const meta = buildPaginationMeta(150, 50, 200);

    expect(meta.startAt).toBe(150);
    expect(meta.maxResults).toBe(50);
    expect(meta.total).toBe(200);
    expect(meta.isLastPage).toBe(true);
    expect(meta.nextStartAt).toBeNull();
  });

  it('computes first and only page correctly', () => {
    const meta = buildPaginationMeta(0, 50, 10);

    expect(meta.startAt).toBe(0);
    expect(meta.maxResults).toBe(50);
    expect(meta.total).toBe(10);
    expect(meta.isLastPage).toBe(true);
    expect(meta.nextStartAt).toBeNull();
  });

  it('treats exact boundary (startAt + maxResults === total) as last page', () => {
    const meta = buildPaginationMeta(150, 50, 200);

    expect(meta.isLastPage).toBe(true);
    expect(meta.nextStartAt).toBeNull();
  });

  it('handles zero total results', () => {
    const meta = buildPaginationMeta(0, 50, 0);

    expect(meta.isLastPage).toBe(true);
    expect(meta.nextStartAt).toBeNull();
  });
});

describe('formatPaginationFooter', () => {
  it('includes "Showing X-Y of Z" and "Last page" for the last page', () => {
    const meta = buildPaginationMeta(150, 50, 200);
    const footer = formatPaginationFooter(meta);

    expect(footer).toContain('Showing 151-200 of 200');
    expect(footer).toContain('Last page');
  });

  it('includes "Showing X-Y of Z" and "Next page: startAt=..." for a middle page', () => {
    const meta = buildPaginationMeta(50, 50, 200);
    const footer = formatPaginationFooter(meta);

    expect(footer).toContain('Showing 51-100 of 200');
    expect(footer).toContain('Next page: startAt=100');
  });

  it('shows correct range when total is smaller than page size', () => {
    const meta = buildPaginationMeta(0, 50, 10);
    const footer = formatPaginationFooter(meta);

    expect(footer).toContain('Showing 1-10 of 10');
    expect(footer).toContain('Last page');
  });

  it('shows correct range for the first page of a multi-page result', () => {
    const meta = buildPaginationMeta(0, 50, 200);
    const footer = formatPaginationFooter(meta);

    expect(footer).toContain('Showing 1-50 of 200');
    expect(footer).toContain('Next page: startAt=50');
  });
});
