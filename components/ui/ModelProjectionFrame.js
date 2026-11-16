import { PROJECTION_FRAME_COLOR } from "@/components/constants/sevenSegments";

export default function ModelProjectionFrame({
  frameData,
  visible = true,
  isFadingOut = false,
  mode = "box", // "box" | "hull" | "both"
}) {
  if (!frameData || !frameData.box) return null;

  const { box, hull } = frameData;
  if (box.width <= 0 || box.height <= 0) return null;

  const isActuallyVisible = visible && !isFadingOut;

  const cornerSize = Math.max(
    8,
    Math.min(18, Math.min(box.width, box.height) * 0.12)
  );

  const hullPointsStr =
    hull && hull.length >= 3
      ? hull.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
      : "";

  return (
    <svg
      className={`pointer-events-none fixed inset-0 z-15 h-full w-full overflow-visible transition-opacity duration-250 ease-out ${
        isActuallyVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      <defs>
        <filter id="frameGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="2"
            floodColor={PROJECTION_FRAME_COLOR}
            floodOpacity="0.45"
          />
          <feDropShadow
            dx="0"
            dy="1"
            stdDeviation="3"
            floodColor="#000000"
            floodOpacity="0.35"
          />
        </filter>
      </defs>

      {/* 1. 外輪廓多邊形投影（0x999999 細線條 Convex Hull） */}
      {(mode === "hull" || mode === "both") && hullPointsStr && (
        <polygon
          points={hullPointsStr}
          fill="none"
          stroke={PROJECTION_FRAME_COLOR}
          strokeWidth="1.2"
          strokeOpacity="0.85"
          strokeDasharray="4 3"
          filter="url(#frameGlow)"
        />
      )}

      {/* 2. 相機視角看向模型的外輪廓投影矩形框（0x999999 細線條投影框） */}
      {(mode === "box" || mode === "both") && (
        <g filter="url(#frameGlow)">
          {/* 外框完整細線條 */}
          <rect
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            fill="none"
            stroke={PROJECTION_FRAME_COLOR}
            strokeWidth="1"
            strokeOpacity="0.8"
            rx="4"
          />

          {/* 四角加強定位標記 (L-shaped corners) */}
          {/* 左上角 Top-Left */}
          <path
            d={`M ${box.x} ${box.y + cornerSize} L ${box.x} ${box.y} L ${
              box.x + cornerSize
            } ${box.y}`}
            fill="none"
            stroke={PROJECTION_FRAME_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* 右上角 Top-Right */}
          <path
            d={`M ${box.x + box.width - cornerSize} ${box.y} L ${
              box.x + box.width
            } ${box.y} L ${box.x + box.width} ${box.y + cornerSize}`}
            fill="none"
            stroke={PROJECTION_FRAME_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* 左下角 Bottom-Left */}
          <path
            d={`M ${box.x} ${box.y + box.height - cornerSize} L ${box.x} ${
              box.y + box.height
            } L ${box.x + cornerSize} ${box.y + box.height}`}
            fill="none"
            stroke={PROJECTION_FRAME_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* 右下角 Bottom-Right */}
          <path
            d={`M ${box.x + box.width - cornerSize} ${box.y + box.height} L ${
              box.x + box.width
            } ${box.y + box.height} L ${box.x + box.width} ${
              box.y + box.height - cornerSize
            }`}
            fill="none"
            stroke={PROJECTION_FRAME_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
