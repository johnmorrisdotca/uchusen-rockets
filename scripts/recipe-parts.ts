// What a recipe part that nothing fell in means. Pure.

/**
 * Says whether a part of a recipe is to be skipped for want of triangles.
 * @param recipe The recipe's id, for the message.
 * @param part The recipe's part.
 * @param filled True where at least one triangle fell in it.
 * @returns False for a part with triangles; true for an empty part marked `optional: true`, which has no file.
 * @throws For an empty part that is not optional: a typo in a rule or a box in the wrong place would otherwise drop a file without a sign.
 */
export function skipsEmptyPart(recipe: string, part: { id: string; optional?: boolean }, filled: boolean): boolean {
  if (filled) return false;
  if (!part.optional) throw new Error(`${recipe}: nothing fell in the part "${part.id}"; check its rule, or mark the part optional: true where the model does not draw it`);
  return true;
}
