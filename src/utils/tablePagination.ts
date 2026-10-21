export function getTablePage(total: number, requestedPage: number, pageSize: number) {
  const size = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(pageCount, Math.max(1, Math.floor(requestedPage)));
  const start = (page - 1) * size;
  return { page, pageCount, start, end: Math.min(total, start + size), size };
}