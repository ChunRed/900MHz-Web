export default function ModelProjectionFrame({
  frameData,
  visible = true,
  isFadingOut = false,
  isDarkMode = true,
  mode = "both", // "box" | "hull" | "both"
}) {
  if (!frameData || !frameData.box) return null;

  const { box, hull } = frameData;
  if (box.width <= 0 || box.height <= 0) return null;

  const isActuallyVisible = visible && !isFadingOut;

  // 日夜間模式高對比科技配色（確保日間白底與夜間黑底皆具備清晰明暗層次）
  const primaryColor = isDarkMode ? "#dddddd" : "#18181b";
  const secondaryColor = isDarkMode ? "#888888" : "#52525b";
  const subtleColor = isDarkMode ? "#444444" : "#a1a1aa";

  const cornerSize = Math.max(
    10,
    Math.min(20, Math.min(box.width, box.height) * 0.12)
  );
  const midX = box.x + box.width * 0.5;
  const midY = box.y + box.height * 0.5;
  const tickLen = 5;

  const hullPointsStr =
    hull && hull.length >= 3
      ? hull.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
      : "";

  const corners = [
    { x: box.x, y: box.y, dx: 1, dy: 1 },
    { x: box.x + box.width, y: box.y, dx: -1, dy: 1 },
    { x: box.x, y: box.y + box.height, dx: 1, dy: -1 },
    { x: box.x + box.width, y: box.y + box.height, dx: -1, dy: -1 },
  ];

  return (
    <svg
      className={`pointer-events-none fixed inset-0 z-15 h-full w-full overflow-visible transition-opacity duration-250 ease-out ${
        isActuallyVisible ? "opacity-100" : "opacity-0"
      }`}
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      {/* 1. 外輪廓多邊形投影（虛線輪廓 + 轉角追蹤方框節點，參考圖三） */}
      {(mode === "hull" || mode === "both") && hullPointsStr && (
        <g>
          <polygon
            points={hullPointsStr}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1"
            strokeDasharray="4 3"
            strokeOpacity="0.85"
          />
          {hull.map((pt, idx) => (
            <g key={idx}>
              <rect
                x={pt.x - 2.5}
                y={pt.y - 2.5}
                width="5"
                height="5"
                fill="none"
                stroke={primaryColor}
                strokeWidth="0.9"
                strokeOpacity="0.85"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="1"
                fill={primaryColor}
              />
            </g>
          ))}
        </g>
      )}

      {/* 2. 外輪廓投影矩形框（底層細線、中段刻度、轉角粗線與端點節點、CAD 數據標記） */}
      {(mode === "box" || mode === "both") && (
        <g>
          {/* 底層細線外框 */}
          <rect
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            fill="none"
            stroke={subtleColor}
            strokeWidth="0.9"
            strokeOpacity="0.85"
          />

          {/* 四邊中點十字刻度線 (Dimension Ticks) */}
          <line
            x1={midX}
            y1={box.y - tickLen}
            x2={midX}
            y2={box.y + tickLen}
            stroke={secondaryColor}
            strokeWidth="1"
          />
          <line
            x1={midX}
            y1={box.y + box.height - tickLen}
            x2={midX}
            y2={box.y + box.height + tickLen}
            stroke={secondaryColor}
            strokeWidth="1"
          />
          <line
            x1={box.x - tickLen}
            y1={midY}
            x2={box.x + tickLen}
            y2={midY}
            stroke={secondaryColor}
            strokeWidth="1"
          />
          <line
            x1={box.x + box.width - tickLen}
            y1={midY}
            x2={box.x + box.width + tickLen}
            y2={midY}
            stroke={secondaryColor}
            strokeWidth="1"
          />

          {/* 四角轉角處粗線 L 型加強與端點方塊節點 */}
          {corners.map((c, i) => (
            <g key={i}>
              <path
                d={`M ${c.x} ${c.y + c.dy * cornerSize} L ${c.x} ${c.y} L ${
                  c.x + c.dx * cornerSize
                } ${c.y}`}
                fill="none"
                stroke={primaryColor}
                strokeWidth="2.2"
                strokeLinecap="square"
              />
              <rect
                x={c.x - 2}
                y={c.y - 2}
                width="4"
                height="4"
                fill={primaryColor}
              />
            </g>
          ))}

          {/* 左上角與右下角微縮科技編號標記 */}
          <text
            x={box.x + 6}
            y={box.y - 6}
            fill={secondaryColor}
            fontSize="9"
            fontFamily="monospace"
            letterSpacing="0.12em"
          >
            PROJ // 900.0
          </text>
          <text
            x={box.x + box.width - 4}
            y={box.y + box.height + 12}
            fill={secondaryColor}
            fontSize="9"
            fontFamily="monospace"
            textAnchor="end"
            letterSpacing="0.08em"
          >
            {Math.round(box.width)}×{Math.round(box.height)}
          </text>
        </g>
      )}
    </svg>
  );
}
