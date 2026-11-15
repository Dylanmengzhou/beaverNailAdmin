export const DEFAULT_HOME = {
  slides: [
    {
      id: "nails",
      image: "/images/colorful-beauty.png",
      enabled: true,
      title: { zh: "NAIL ART · 美甲", en: "NAIL ART", kr: "NAIL ART · 네일" },
      alt: {
        zh: "多巴胺美甲与可爱花朵细节",
        en: "Colorful nail art with tiny flower details",
        kr: "컬러풀한 네일과 작은 꽃 디테일",
      },
    },
    {
      id: "makeup",
      image: "/images/aura-makeup.png",
      enabled: true,
      title: { zh: "MAKEUP · 化妆", en: "MAKEUP", kr: "MAKEUP · 메이크업" },
      alt: {
        zh: "粉色腮红和亮泽唇妆的韩式妆容示意",
        en: "Fresh Korean makeup with rosy cheeks and glossy lips",
        kr: "로지 블러셔와 촉촉한 핑크 립 메이크업",
      },
    },
  ],
};
export type HomeContent = typeof DEFAULT_HOME;
