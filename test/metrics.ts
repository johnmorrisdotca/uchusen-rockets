// A small reader for the tests: a drawing's size from its root element.
export function readMetrics(svg: string): { width: number; height: number } {
  const match = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!match) throw new Error("a drawing with no viewBox");
  return { width: Number(match[1]), height: Number(match[2]) };
}
