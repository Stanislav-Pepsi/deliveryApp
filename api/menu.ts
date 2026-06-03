import { DishData, DishModifierGroup, DishSize, DishTag } from '../App';
import { BASE_URL, baseHeaders } from './config';

interface ApiModifier {
  id: string;
  name: string;
  price: number;
  minAmount: number;
  maxAmount: number;
}

interface ApiModifierGroup {
  name: string;
  groupId: string | null;
  minQuantity: number;
  maxQuantity: number;
  modifiers: ApiModifier[];
}

interface ApiSize {
  sizeId: string | null;
  sizeName: string;
  isDefault: boolean;
  portionWeightGrams: number | null;
  price: number;
  energy: number;
  modifierGroups: ApiModifierGroup[];
}

interface ApiItem {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  isAvailable: boolean;
  sizes: ApiSize[];
  tags?: DishTag[];
}

interface ApiCategory {
  id: string;
  name: string;
  items: ApiItem[];
}

interface ApiMenuResponse {
  itemCategories: ApiCategory[];
}

function mapSize(s: ApiSize): DishSize {
  const groups: DishModifierGroup[] = (s.modifierGroups ?? []).map(g => ({
    name: g.name,
    groupId: g.groupId,
    minQuantity: g.minQuantity ?? 0,
    maxQuantity: g.maxQuantity ?? 0,
    modifiers: (g.modifiers ?? []).map(m => ({
      id: m.id,
      name: m.name,
      price: m.price ?? 0,
    })),
  }));
  return {
    sizeId: s.sizeId,
    sizeName: s.sizeName,
    isDefault: s.isDefault,
    price: s.price,
    portionWeightGrams: s.portionWeightGrams,
    energy: s.energy ?? 0,
    modifierGroups: groups,
  };
}

export async function fetchMenu(token: string): Promise<DishData[]> {
  const res = await fetch(`${BASE_URL}/menu`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка загрузки меню');
  const data: ApiMenuResponse = await res.json().catch(() => ({ itemCategories: [] }));

  const dishes: DishData[] = [];
  const seenIds = new Set<string>();
  for (const cat of data.itemCategories ?? []) {
    for (const item of cat.items ?? []) {
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      const rawSizes = item.sizes ?? [];
      if (rawSizes.length === 0) continue;
      const def = rawSizes.find(s => s.isDefault) ?? rawSizes[0];
      const sizes = rawSizes.map(mapSize);
      dishes.push({
        id: item.id,
        name: item.name,
        weight: def.portionWeightGrams ? `${def.portionWeightGrams} г` : '',
        desc: item.description ?? '',
        price: `${Math.round(def.price).toLocaleString('ru-RU')} ₸`,
        img: item.image ? { uri: item.image } : null,
        category: cat.name,
        calories: def.energy ?? 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        time: '—',
        sizeId: def.sizeId ?? undefined,
        sizes,
        tags: (item.tags ?? []).map(t => ({
          key: t.key,
          label: t.label,
          imageUrl: t.imageUrl ?? (t as any).image_url ?? null,
        })),
        isAvailable: item.isAvailable !== false,
      });
    }
  }
  return dishes;
}
