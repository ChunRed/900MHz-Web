// 大七段顯示器顏色設定
export const SEGMENT_COLORS = {
  base: 0xbbbbbb,
  hover: 0x999999,
  pressed: 0x777777,
};

// 大七段顯示器各段定義（對照標準 A~G 編號 1~7 與 Blender 物件名稱）
// 註：Three.js GLTFLoader 載入時會將名稱中的 "." 移除（例如 "Plane.008" 會變成 "Plane008"）
export const SEVEN_SEGMENTS = {
  Plane010: {
    id: 1,
    code: "A",
    label: "上段 (Top)",
    meshName: "Plane.010",
  },
  Plane014: {
    id: 2,
    code: "B",
    label: "右上段 (Top-Right)",
    meshName: "Plane.014",
  },
  Plane013: {
    id: 3,
    code: "C",
    label: "右下段 (Bottom-Right)",
    meshName: "Plane.013",
  },
  Plane009: {
    id: 4,
    code: "D",
    label: "下段 (Bottom)",
    meshName: "Plane.009",
  },
  Plane011: {
    id: 5,
    code: "E",
    label: "左下段 (Bottom-Left)",
    meshName: "Plane.011",
  },
  Plane012: {
    id: 6,
    code: "F",
    label: "左上段 (Top-Left)",
    meshName: "Plane.012",
  },
  Plane008: {
    id: 7,
    code: "G",
    label: "中段 (Middle)",
    meshName: "Plane.008",
  },
};

export const getSegmentInfoByName = (name) => {
  if (!name) return null;
  const normalized = name.replace(/\./g, "");
  return SEVEN_SEGMENTS[normalized] || null;
};

