export type IndexedItem<T> = {
  item: T;
  index: number;
};

/** Split a list into unpurchased (to buy) then purchased (got it), keeping source indexes. */
export function splitIndexedByPurchased<T extends { purchased: boolean }>(
  items: T[],
): { toBuy: IndexedItem<T>[]; gotIt: IndexedItem<T>[] } {
  const indexed = items.map((item, index) => ({ item, index }));
  return {
    toBuy: indexed.filter(({ item }) => !item.purchased),
    gotIt: indexed.filter(({ item }) => item.purchased),
  };
}
