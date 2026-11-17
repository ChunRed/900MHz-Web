import SevenSegmentRow2D from "@/components/ui/SevenSegmentRow2D";

export default function MainSevenSegmentBubble({
  segmentMatrix = [],
  frameData,
  visible = true,
  isFadingOut = false,
  isDarkMode = true,
}) {
  if (!frameData || !frameData.bubbleTip) return null;

  const isActuallyVisible = visible && !isFadingOut;
  const { bubbleTip } = frameData;

  const viewportWidth = bubbleTip.viewportWidth || 390;
  const centerX = viewportWidth * 0.5;

  // 對話框外框尺寸與位置（包圍上方八個 2D 小七段顯示器，與上方 900MHz Logo 保持間距）
  const boxWidth = Math.min(288, Math.max(248, viewportWidth - 60));
  const boxHeight = 60;
  const boxLeft = centerX - boxWidth * 0.5;
  const boxRight = centerX + boxWidth * 0.5;
  const boxTop = 94;
  const boxBottom = boxTop + boxHeight;
  const cornerLen = 10;

  // 對話框下方尖角動態指向模型上方，底部開口隨尖角水平位置自然偏移
  const tipX = bubbleTip.x;
  const tipY = Math.max(boxBottom + 24, bubbleTip.y);

  const halfBase = 18;
  const baseCenterX = Math.max(
    boxLeft + cornerLen + halfBase + 8,
    Math.min(
      boxRight - cornerLen - halfBase - 8,
      centerX + (tipX - centerX) * 0.42
    )
  );
  const baseLeftX = baseCenterX - halfBase;
  const baseRightX = baseCenterX + halfBase;

  const bubblePath = [
    `M ${boxLeft} ${boxTop}`,
    `L ${boxRight} ${boxTop}`,
    `L ${boxRight} ${boxBottom}`,
    `L ${baseRightX} ${boxBottom}`,
    `L ${tipX} ${tipY}`,
    `L ${baseLeftX} ${boxBottom}`,
    `L ${boxLeft} ${boxBottom}`,
    "Z",
  ].join(" ");

  // 日夜間高對比配色（夜間 #dddddd 科技白灰、日間 #18181b 銳利深黑線條）
  const strokeColor = isDarkMode ? "#dddddd" : "#18181b";
  const secondaryStroke = isDarkMode ? "#888888" : "#52525b";
  const fillColor = isDarkMode
    ? "rgba(10, 10, 12, 0.72)"
    : "rgba(24, 24, 27, 0.94)";

  const corners = [
    { x: boxLeft, y: boxTop, dx: 1, dy: 1 },
    { x: boxRight, y: boxTop, dx: -1, dy: 1 },
    { x: boxLeft, y: boxBottom, dx: 1, dy: -1 },
    { x: boxRight, y: boxBottom, dx: -1, dy: -1 },
  ];

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-15 transition-opacity duration-250 ease-out ${
        isActuallyVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden={!isActuallyVisible}
    >
      {/* 對話框虛線外框、四角粗線/圓點加強、轉折節點與指向模型上方的動態尖角 */}
      <svg
        className="h-full w-full overflow-visible"
        shapeRendering="geometricPrecision"
      >
        {/* 主體虛線外框與尖角面 */}
        <path
          d={bubblePath}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1.15"
          strokeDasharray="5 3.5"
          strokeLinejoin="miter"
        />

        {/* 四個外框轉角：粗線 L 型加固 + 端點小方塊 */}
        {corners.map((c, i) => (
          <g key={i}>
            <path
              d={`M ${c.x} ${c.y + c.dy * cornerLen} L ${c.x} ${c.y} L ${
                c.x + c.dx * cornerLen
              } ${c.y}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinecap="square"
            />
            <rect
              x={c.x - 1.8}
              y={c.y - 1.8}
              width="3.6"
              height="3.6"
              fill={strokeColor}
            />
          </g>
        ))}

        {/* 底部尖角開口兩側轉折處：圓點加強 */}
        <circle cx={baseLeftX} cy={boxBottom} r="2.2" fill={strokeColor} />
        <circle cx={baseRightX} cy={boxBottom} r="2.2" fill={strokeColor} />

        {/* 尖角末端瞄準節點：實心圓點 + 追蹤小方框 */}
        <rect
          x={tipX - 3.5}
          y={tipY - 3.5}
          width="7"
          height="7"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1"
        />
        <circle cx={tipX} cy={tipY} r="2" fill={strokeColor} />

        {/* 框線上方微縮遙測標記 */}
        <text
          x={boxLeft + 4}
          y={boxTop - 5}
          fill={secondaryStroke}
          fontSize="8.5"
          fontFamily="monospace"
          letterSpacing="0.12em"
        >
          SEG // 01-08
        </text>
        <text
          x={boxRight - 4}
          y={boxTop - 5}
          fill={secondaryStroke}
          fontSize="8.5"
          fontFamily="monospace"
          textAnchor="end"
          letterSpacing="0.1em"
        >
          TX-BUF
        </text>
      </svg>

      {/* 對話框內的八個 2D 小七段顯示器圖示 */}
      <div
        style={{
          left: `${boxLeft}px`,
          top: `${boxTop}px`,
          width: `${boxWidth}px`,
          height: `${boxHeight}px`,
        }}
        className="fixed flex items-center justify-center"
      >
        <SevenSegmentRow2D
          segmentMatrix={segmentMatrix}
          digitClassName="h-9 w-5 sm:h-10 sm:w-5.5"
          gapClassName="gap-1.5 sm:gap-2.5"
        />
      </div>
    </div>
  );
}
