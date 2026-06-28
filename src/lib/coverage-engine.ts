import { TTAP_ITEMS, ITEM_CONCEPT_MAP, type TTAPDomain } from "../data/ttap-items";

export type ItemRating =
  | "fail"
  | "emerging_1"
  | "emerging_2"
  | "emerging_3"
  | "success_1"
  | "success_2"
  | "success_3";

export const ITEM_RATING_WEIGHTS: Record<ItemRating, number> = {
  fail: 0,
  emerging_1: 0.2,
  emerging_2: 0.35,
  emerging_3: 0.5,
  success_1: 0.6,
  success_2: 0.8,
  success_3: 1.0,
};

export const ITEM_RATING_LABELS: Record<ItemRating, string> = {
  fail: "لم ينجح",
  emerging_1: "ظهر في قسم واحد ناشئة",
  emerging_2: "ظهر في قسمين ناشئة",
  emerging_3: "ظهر في الأقسام الثلاثة ناشئة",
  success_1: "ظهر في قسم واحد نجاح",
  success_2: "ظهر في قسمين نجاح",
  success_3: "ظهر في الأقسام الثلاثة نجاح",
};

export type ItemClassifications = Record<number, ItemRating | null | undefined>;
export type DomainScores = Record<string, { success: number; emerging: number; fail: number }>;

export type ConceptResult = {
  concept: string;
  domain: TTAPDomain;
  masteryScore: number; // 0–100
  classifiedItemCount: number;
  source: "items" | "domain";
};

export const CONCEPT_DOMAIN_MAP: Array<{ concept: string; domain: TTAPDomain }> = [
  { concept: "المهارات الأكاديمية الوظيفية", domain: "VS" },
  { concept: "الاستخدام التقني", domain: "VS" },
  { concept: "التعلم المستمر", domain: "VB" },
  { concept: "تقرير المصير", domain: "VB" },
  { concept: "إدارة المال", domain: "IF" },
  { concept: "العناية الذاتية", domain: "IF" },
  { concept: "التنقل المستقل", domain: "IF" },
  { concept: "السلامة الشخصية", domain: "IF" },
  { concept: "المشاركة المجتمعية", domain: "LS" },
  { concept: "الصحة واللياقة", domain: "LS" },
  { concept: "التواصل الوظيفي", domain: "FC" },
  { concept: "العلاقات الاجتماعية", domain: "IB" },
];

export function computeCoverage(
  domainScores: DomainScores,
  itemClassifications: ItemClassifications,
): ConceptResult[] {
  return CONCEPT_DOMAIN_MAP.map(({ concept, domain }) => {
    const conceptItems = TTAP_ITEMS.filter((item) =>
      ITEM_CONCEPT_MAP[item.id]?.includes(concept),
    );
    const classified = conceptItems.filter((item) => itemClassifications[item.id] != null);

    if (classified.length > 0) {
      const weightSum = classified.reduce((sum, item) => {
        const r = itemClassifications[item.id] as ItemRating;
        return sum + (ITEM_RATING_WEIGHTS[r] ?? 0);
      }, 0);
      return {
        concept,
        domain,
        masteryScore: Math.round((weightSum / classified.length) * 100),
        classifiedItemCount: classified.length,
        source: "items",
      };
    }

    const d = domainScores[domain];
    return {
      concept,
      domain,
      masteryScore: d?.success ?? 0,
      classifiedItemCount: 0,
      source: "domain",
    };
  });
}
