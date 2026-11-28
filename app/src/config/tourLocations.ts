/** 2026-11-28 운영자가 확인한 방문 장소. 집결지·도로명 주소·좌표로 해석하지 않는다. */
export const tourLocations: Record<string, readonly { name: string; locality: string; region: string; country: string }[]> = {
  "coron-freediving-tour-2026": [
    { name: "바라쿠다 호 (Barracuda Lake), 코론 섬", locality: "Coron", region: "Palawan", country: "PH" },
    { name: "듀공 와칭 오피스 (Dugong Watch), 깔라윗섬 일대", locality: "Busuanga", region: "Palawan", country: "PH" },
    { name: "디미팍 아일랜드 (Dimipac Island)", locality: "Coron/Busuanga", region: "Palawan, Mimaropa", country: "PH" },
  ],
};
