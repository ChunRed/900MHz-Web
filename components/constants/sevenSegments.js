// 電話本體預設素模顏色
export const CLAY_BODY_COLORS = {
  light: 0xffffff,
  dark: 0xd4d4d8,
};

// 大七段顯示器下方底板模型名稱與顏色
export const BIG_DISPLAY_BACKPLATE_NAME = "Plane015";
export const BIG_DISPLAY_BACKPLATE_COLOR = 0x555555;

// LED1-4 模型名稱與顏色
export const LED_NAMES = ["LED1", "LED2", "LED3", "LED4"];
export const LED_COLOR = 0x666666;

// ring 模型名稱與顏色
export const RING_NAME = "ring";
export const RING_COLOR = 0x888888;

// 最下方底座模型（Cube）名稱與顏色
export const BASE_NAME = "Cube";
export const BASE_COLOR = 0x888888;

// 相機外輪廓投影框顏色
export const PROJECTION_FRAME_COLOR = "#444444";

// 小七段顯示器預設顏色與點亮暖黃光（Light Emission）設定
export const SMALL_SEGMENT_DEFAULT_COLOR = 0x888888;
export const SMALL_SEGMENT_ACTIVE_STYLE = {
  color: 0xffe196,
  emissive: 0xffe196,
  defaultIntensity: 1.0,
  haloOpacityDark: 0.24,
  haloOpacityLight: 0.14,
};

// 大七段顯示器點亮時暖黃光與光暈（Halo）設定
export const BIG_SEGMENT_ACTIVE_STYLE = {
  color: 0xffe196,
  emissive: 0xffe196,
  defaultIntensity: 0.7,
  haloOpacityDark: 0.52,
  haloOpacityLight: 0.28,
  pointLightIntensityDark: 1.8,
  pointLightIntensityLight: 1.0,
};

export const SMALL_DIGIT_COUNT = 8;

// 大七段顯示器顏色設定（預設為 0x777777）
export const SEGMENT_COLORS = {
  base: 0x777777,
  hover: 0x999999,
  pressed: 0x555555,
};

export const SEGMENT_DARK_COLORS = {
  base: 0x777777,
  hover: 0x999999,
  pressed: 0x555555,
};

// 大七段顯示器各段定義（依實際空間位置對應小七段 seg-sm1 ~ seg-sm7）
// 註：Three.js GLTFLoader 載入時會將名稱中的 "." 移除（例如 "Plane.008" 會變成 "Plane008"）
export const SEVEN_SEGMENTS = {
  Plane010: {
    id: 1,
    code: "A",
    label: "上段 (Top)",
    meshName: "Plane.010",
    smallSegId: 1,
  },
  Plane014: {
    id: 2,
    code: "B",
    label: "右上段 (Top-Right)",
    meshName: "Plane.014",
    smallSegId: 7,
  },
  Plane013: {
    id: 3,
    code: "C",
    label: "右下段 (Bottom-Right)",
    meshName: "Plane.013",
    smallSegId: 6,
  },
  Plane009: {
    id: 4,
    code: "D",
    label: "下段 (Bottom)",
    meshName: "Plane.009",
    smallSegId: 3,
  },
  Plane011: {
    id: 5,
    code: "E",
    label: "左下段 (Bottom-Left)",
    meshName: "Plane.011",
    smallSegId: 4,
  },
  Plane012: {
    id: 6,
    code: "F",
    label: "左上段 (Top-Left)",
    meshName: "Plane.012",
    smallSegId: 5,
  },
  Plane008: {
    id: 7,
    code: "G",
    label: "中段 (Middle)",
    meshName: "Plane.008",
    smallSegId: 2,
  },
};

export const getSegmentInfoByName = (name) => {
  if (!name) return null;
  const normalized = name.replace(/\./g, "");
  return SEVEN_SEGMENTS[normalized] || null;
};

// 解析小七段顯示器節點名稱（相容 "seg-sm1.001" 與 Three.js 移除小數點後的 "seg-sm1001"）
export const getSmallSegmentInfoByName = (name) => {
  if (!name) return null;
  const match = name.match(/^seg-sm([1-7])\.?(\d{3})$/i);
  if (!match) return null;

  const segId = Number(match[1]);
  const digitIndex = Number.parseInt(match[2], 10) - 1;
  if (digitIndex < 0 || digitIndex >= SMALL_DIGIT_COUNT) return null;

  return { segId, digitIndex };
};

export const isLedMeshName = (name) => {
  if (!name) return false;
  const normalized = name.replace(/\./g, "");
  return /^LED[1-4]$/i.test(normalized);
};

export const isRingMeshName = (name) => {
  if (!name) return false;
  const normalized = name.replace(/\./g, "");
  return /^ring$/i.test(normalized);
};

export const isBaseMeshName = (name) => {
  if (!name) return false;
  const normalized = name.replace(/\./g, "");
  return /^cube(?:\d+)?$/i.test(normalized);
};
