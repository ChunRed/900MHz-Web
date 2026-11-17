export default function SegmentInputHint({
  anchorPos,
  visible = false,
  isFadingOut = false,
  isDarkMode = true,
}) {
  if (!anchorPos) return null;

  const isActuallyVisible = visible && !isFadingOut;
  if (!visible && !isFadingOut) return null;

  // 依照參考圖一：從大七段顯示器中間段 (Plane.008) 往右上斜拉出，連接右上方的科技風分格標示
  const pillWidth = 224;
  const pillHeight = 46;
  const viewportWidth = anchorPos.viewportWidth || 390;

  const pillLeft = Math.min(
    viewportWidth - pillWidth - 14,
    Math.max(anchorPos.x - 16, anchorPos.x + 12)
  );
  const pillTop = Math.max(88, anchorPos.y - 135 - pillHeight);

  // 折線轉角與接入點（由中間段往右上斜延伸至 elbow，再垂直向上接入標示底緣）
  const attachX = Math.max(
    anchorPos.x + 56,
    Math.min(pillLeft + pillWidth - 28, pillLeft + pillWidth * 0.45)
  );
  const attachY = pillTop + pillHeight;
  const elbowX = attachX;
  const elbowY = attachY + 14;

  const primaryStroke = isDarkMode ? "#ffffff" : "#18181b";
  const haloColor = isDarkMode ? "#000000" : "#ffffff";

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-15 transition-opacity duration-300 ease-out ${
        isActuallyVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden={!isActuallyVisible}
    >
      <svg
        className="h-full w-full overflow-visible"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <filter
            id="segmentHintGlow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="1.8"
              floodColor={haloColor}
              floodOpacity="0.75"
            />
          </filter>
        </defs>
        <g filter="url(#segmentHintGlow)">
          {/* 指向大七段中間段的十字準星標記 */}
          <circle
            cx={anchorPos.x}
            cy={anchorPos.y}
            r="6.5"
            fill="none"
            stroke={primaryStroke}
            strokeWidth="1"
            strokeDasharray="3 2"
          />
          <circle
            cx={anchorPos.x}
            cy={anchorPos.y}
            r="2.5"
            fill={primaryStroke}
          />

          {/* 往右上斜拉出的細線 + 轉角圓點與粗線加強 */}
          <polyline
            points={`${anchorPos.x},${anchorPos.y} ${elbowX},${elbowY} ${attachX},${attachY}`}
            fill="none"
            stroke={primaryStroke}
            strokeWidth="1.15"
          />
          <line
            x1={elbowX}
            y1={elbowY}
            x2={attachX}
            y2={attachY}
            stroke={primaryStroke}
            strokeWidth="2.4"
          />
          <circle cx={elbowX} cy={elbowY} r="2.3" fill={primaryStroke} />
          <rect
            x={attachX - 3}
            y={attachY - 1.5}
            width="6"
            height="3"
            fill={primaryStroke}
          />
        </g>
      </svg>

      {/* 右上方 GD&T 科技風分格提示區塊（夜間白灰底黑字、日間黑底白字） */}
      <div
        style={{
          left: `${Math.round(pillLeft)}px`,
          top: `${Math.round(pillTop)}px`,
          width: `${pillWidth}px`,
          minHeight: `${pillHeight}px`,
        }}
        className={`fixed flex items-stretch overflow-hidden border shadow-lg transition-colors duration-200 ${
          isDarkMode
            ? "border-[#dddddd] bg-[#dddddd] text-zinc-900"
            : "border-zinc-900 bg-zinc-900 text-white"
        }`}
      >
        {/* 左側編號反相面 */}
        <div
          className={`flex flex-col items-center justify-center border-r px-2 font-mono text-[9px] font-bold leading-tight ${
            isDarkMode
              ? "border-zinc-400 bg-zinc-900 text-[#dddddd]"
              : "border-zinc-700 bg-[#dddddd] text-zinc-900"
          }`}
        >
          <span>INP</span>
          <span>G07</span>
        </div>

        {/* 右側雙語訊息面 */}
        <div className="flex flex-1 flex-col items-start justify-center px-3 py-1.5 text-left">
          <span className="text-xs font-semibold leading-tight tracking-wide">
            點擊按鈕來輸入訊息
          </span>
          <span
            className={`mt-0.5 font-mono text-[9.5px] font-medium uppercase leading-tight tracking-wider ${
              isDarkMode ? "text-zinc-600" : "text-zinc-300"
            }`}
          >
            Click buttons to input
          </span>
        </div>
      </div>
    </div>
  );
}
