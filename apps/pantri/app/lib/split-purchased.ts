export type IndexedItem<T> = {
  item: T;
  index: number;
};

function byItemName<T extends { name: string }>(a: IndexedItem<T>, b: IndexedItem<T>) {
  return a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" });
}

/** Split a list into unpurchased (to buy) then purchased (got it), keeping source indexes. */
export function splitIndexedByPurchased<T extends { purchased: boolean; name: string }>(
  items: T[],
): { toBuy: IndexedItem<T>[]; gotIt: IndexedItem<T>[] } {
  const indexed = items.map((item, index) => ({ item, index }));
  return {
    toBuy: indexed.filter(({ item }) => !item.purchased).sort(byItemName),
    gotIt: indexed.filter(({ item }) => item.purchased).sort(byItemName),
  };
}
