export default function ClickModelHint({
  frameData,
  visible = true,
  isFadingOut = false,
  isDarkMode = true,
  onClickModel,
}) {
  if (!frameData || !frameData.clickAnchor) return null;

  const { clickAnchor } = frameData;
  const isActuallyVisible = visible && !isFadingOut;

  const pillWidth = 136;
  const pillHeight = 30;

  const pillLeft = clickAnchor.pillX ?? Math.max(20, clickAnchor.x - 155);
  const pillTop = clickAnchor.pillY ?? Math.max(170, clickAnchor.y - 210);

  // 科技風折線（從模型錨點左斜上拉至轉角處，再水平接入標籤右側；轉角處帶圓點與粗線加強）
  const attachX = pillLeft + pillWidth;
  const attachY = pillTop + pillHeight * 0.5;
  const elbowX = attachX + 16;
  const elbowY = attachY;

  const primaryStroke = isDarkMode ? "#dddddd" : "#18181b";
  const secondaryStroke = isDarkMode ? "#888888" : "#52525b";

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-15 transition-opacity duration-250 ease-out ${
        isActuallyVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden={!isActuallyVisible}
    >
      <svg
        className="h-full w-full overflow-visible"
        shapeRendering="geometricPrecision"
      >
        {/* 模型表面十字準星錨點 (Target Reticle) */}
        <g>
          <circle
            cx={clickAnchor.x}
            cy={clickAnchor.y}
            r="6.5"
            fill="none"
            stroke={secondaryStroke}
            strokeWidth="0.9"
            strokeDasharray="3 2"
          />
          <circle
            cx={clickAnchor.x}
            cy={clickAnchor.y}
            r="2.4"
            fill={primaryStroke}
          />
          {/* 準星十字短刻度 */}
          <line
            x1={clickAnchor.x - 10}
            y1={clickAnchor.y}
            x2={clickAnchor.x - 4.5}
            y2={clickAnchor.y}
            stroke={primaryStroke}
            strokeWidth="1"
          />
          <line
            x1={clickAnchor.x + 4.5}
            y1={clickAnchor.y}
            x2={clickAnchor.x + 10}
            y2={clickAnchor.y}
            stroke={primaryStroke}
            strokeWidth="1"
          />
        </g>

        {/* 折線引線：斜線段 (細線) + 水平轉角段 (粗線加強) + 轉角圓點 */}
        <polyline
          points={`${clickAnchor.x},${clickAnchor.y} ${elbowX},${elbowY} ${attachX},${attachY}`}
          fill="none"
          stroke={primaryStroke}
          strokeWidth="1"
        />
        {/* 轉角處粗線加強與圓點節點 */}
        <line
          x1={elbowX}
          y1={elbowY}
          x2={attachX}
          y2={attachY}
          stroke={primaryStroke}
          strokeWidth="2.2"
        />
        <circle cx={elbowX} cy={elbowY} r="2.3" fill={primaryStroke} />
        <rect
          x={attachX - 1.5}
          y={attachY - 3}
          width="3"
          height="6"
          fill={primaryStroke}
        />
      </svg>

      {/* GD&T 科技分格標籤（點、線、面、明暗對比，使用 translate3d 子像素平滑定位） */}
      <div
        style={{
          left: 0,
          top: 0,
          width: `${pillWidth}px`,
          height: `${pillHeight}px`,
          transform: `translate3d(${pillLeft}px, ${pillTop}px, 0)`,
        }}
        className="fixed will-change-transform"
      >
        <button
          type="button"
          onClick={onClickModel}
          tabIndex={isActuallyVisible ? 0 : -1}
          className={`group relative flex h-full w-full items-stretch overflow-hidden border transition-transform duration-150 hover:scale-105 active:scale-95 ${
            isDarkMode
              ? "border-[#dddddd] bg-[#dddddd] text-zinc-900 shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
              : "border-zinc-900 bg-zinc-900 text-white shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
          } ${
            isActuallyVisible
              ? "pointer-events-auto cursor-pointer"
              : "pointer-events-none"
          }`}
        >
          {/* 左側編號分格（反相明暗面） */}
          <span
            className={`flex items-center justify-center border-r px-2 font-mono text-[10px] font-bold tracking-tighter ${
              isDarkMode
                ? "border-zinc-400 bg-zinc-900 text-[#dddddd]"
                : "border-zinc-700 bg-[#dddddd] text-zinc-900"
            }`}
          >
            ▲01
          </span>

          {/* 右側主文字分格 */}
          <span className="flex flex-1 items-center justify-center whitespace-nowrap px-2.5 font-mono text-xs font-semibold tracking-wider">
            Click 點擊
          </span>
        </button>
      </div>
    </div>
  );
}
