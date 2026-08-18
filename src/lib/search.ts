// PostgREST treats , ( ) . : ' " * and \ as operators/delimiters inside .or() filters.
// Any user-supplied string concatenated into a filter string must be sanitised first.
export function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,()."':*\\]/g, ' ').trim().slice(0, 100);
}
