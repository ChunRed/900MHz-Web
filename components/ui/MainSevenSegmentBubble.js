import { useEffect } from "react";
import SevenSegmentRow2D from "@/components/ui/SevenSegmentRow2D";

export default function MainSevenSegmentBubble({
  segmentMatrix = [],
  frameData,
  visible = true,
  isFadingOut = false,
  isDarkMode = true,
  hudOpacity = 1,
  sendMoveT = 0,
  sendPointerOpacity = 1,
  sendBlinkOpacity = 1,
  sendExpandT = 0,
  canCloseSend = false,
  onCloseSend,
}) {
  useEffect(() => {
    if (!canCloseSend) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCloseSend?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canCloseSend, onCloseSend]);

  if (!frameData || !frameData.bubbleTip) return null;

  const isActuallyVisible = visible && !isFadingOut && hudOpacity > 0.01;
  const { bubbleTip } = frameData;

  const viewportWidth = bubbleTip.viewportWidth || 390;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 844;
  const centerX = viewportWidth * 0.5;

  const isExpandingToModal = sendExpandT > 0.005;

  // 對話框初始尺寸與位置（一般位於上方，階段二移至螢幕正中央）
  const baseBoxWidth = Math.min(288, Math.max(248, viewportWidth - 60));
  const baseBoxHeight = 60;
  const baseBoxTop = 94;
  const centerBoxTop = Math.max(110, (viewportHeight - baseBoxHeight) * 0.5);

  const lerp = (a, b, t) => a + (b - a) * t;

  if (isExpandingToModal) {
    const targetCardWidth = Math.min(448, viewportWidth - 32);
    const cardWidth = lerp(baseBoxWidth, targetCardWidth, sendExpandT);
    const padX = lerp(0, 24, sendExpandT);
    const padY = lerp(0, 24, sendExpandT);
    const segSlotHeight = lerp(baseBoxHeight, 114, sendExpandT);
    const segScale = lerp(1, 1.38, sendExpandT);
    const revealT = Math.max(0, Math.min(1, (sendExpandT - 0.18) / 0.82));
    const serializedMatrix = JSON.stringify(segmentMatrix);

    return (
      <div
        style={{
          backgroundColor: `rgba(0, 0, 0, ${0.65 * sendExpandT})`,
          backdropFilter: `blur(${8 * sendExpandT}px)`,
          WebkitBackdropFilter: `blur(${8 * sendExpandT}px)`,
        }}
        className={`fixed inset-0 z-40 flex items-center justify-center px-4 ${
          canCloseSend ? "pointer-events-auto" : "pointer-events-none"
        }`}
        role={canCloseSend ? "dialog" : undefined}
        aria-modal={canCloseSend || undefined}
        aria-labelledby={canCloseSend ? "send-result-title" : undefined}
        onClick={() => {
          if (canCloseSend) onCloseSend?.();
        }}
      >
        <div
          style={{
            width: `${cardWidth}px`,
            paddingLeft: `${padX}px`,
            paddingRight: `${padX}px`,
            paddingTop: `${padY}px`,
            paddingBottom: `${padY}px`,
          }}
          className="relative border border-zinc-700 bg-zinc-950/95 text-zinc-100 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 四角粗線 L 型科技轉角裝飾 */}
          <span className="pointer-events-none absolute -top-0.5 -left-0.5 h-3 w-3 border-t-2 border-l-2 border-[#dddddd]" />
          <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-3 w-3 border-t-2 border-r-2 border-[#dddddd]" />
          <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-3 w-3 border-b-2 border-l-2 border-[#dddddd]" />
          <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-3 w-3 border-b-2 border-r-2 border-[#dddddd]" />

          {/* 上方展開區：遙測狀態分格標題列 */}
          <div
            style={{
              maxHeight: `${sendExpandT * 52}px`,
              marginBottom: `${sendExpandT * 16}px`,
              opacity: revealT,
            }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="border border-[#dddddd] bg-[#dddddd] px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-900">
                  TX // 08
                </span>
                <h2
                  id="send-result-title"
                  className="font-mono text-sm font-semibold tracking-wider text-white whitespace-nowrap"
                >
                  已傳送內容
                </h2>
              </div>
              <span className="font-mono text-[10px] tracking-widest text-zinc-500 whitespace-nowrap">
                900.0 MHz
              </span>
            </div>
          </div>

          {/* 中央銜接區：直接沿用原對話框的八個 2D 小七段顯示器（平滑放大） */}
          <div
            style={{ height: `${segSlotHeight}px` }}
            className="relative flex items-center justify-center border border-dashed border-[#dddddd]/80 bg-black/90 px-3"
          >
            <div
              style={{ opacity: Math.max(0, 1 - sendExpandT * 2.5) }}
              className="pointer-events-none absolute -top-3.5 left-1 font-mono text-[8.5px] tracking-[0.1em] text-[#888888] whitespace-nowrap"
            >
              SEG // 01-08 · 傳送訊息內容
            </div>
            <div
              style={{ opacity: Math.max(0, 1 - sendExpandT * 2.5) }}
              className="pointer-events-none absolute -top-3.5 right-1 font-mono text-[8.5px] tracking-[0.1em] text-[#888888] whitespace-nowrap"
            >
              TX-BUF
            </div>
            <div style={{ transform: `scale(${segScale})` }}>
              <SevenSegmentRow2D
                segmentMatrix={segmentMatrix}
                digitClassName="h-9 w-5 sm:h-10 sm:w-5.5"
                gapClassName="gap-1.5 sm:gap-2.5"
              />
            </div>
          </div>

          {/* 下方展開區：陣列數據與 ESC 關閉按鈕 */}
          <div
            style={{
              maxHeight: `${sendExpandT * 240}px`,
              marginTop: `${sendExpandT * 10}px`,
              opacity: revealT,
            }}
            className="overflow-hidden"
          >
            <div className="border border-zinc-800/80 bg-black/60 p-2.5 font-mono text-[10px] leading-relaxed break-all text-zinc-400 select-all">
              <div className="mb-1 flex items-center justify-between border-b border-zinc-900 pb-1 text-[9px] text-zinc-600">
                <span>ARRAY // [A,B,C,D,E,F,G]</span>
                <span>8×7 BIT</span>
              </div>
              {serializedMatrix}
            </div>

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                disabled={!canCloseSend}
                onClick={() => onCloseSend?.()}
                className="flex cursor-pointer items-stretch overflow-hidden border border-[#dddddd] bg-[#dddddd] text-zinc-900 transition-transform hover:bg-white active:scale-95 disabled:cursor-default"
              >
                <span className="flex items-center justify-center border-r border-zinc-400 bg-zinc-900 px-2.5 font-mono text-[10px] font-bold text-[#dddddd]">
                  ESC
                </span>
                <span className="px-6 py-1.5 font-mono text-xs font-semibold tracking-wider">
                  關閉
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const boxWidth = baseBoxWidth;
  const boxHeight = baseBoxHeight;
  const boxLeft = centerX - boxWidth * 0.5;
  const boxRight = centerX + boxWidth * 0.5;
  const boxTop = baseBoxTop + (centerBoxTop - baseBoxTop) * sendMoveT;
  const boxBottom = boxTop + boxHeight;
  const cornerLen = 10;

  // 對話框下方尖角動態指向模型上方；進入傳送居中時平滑收起尖角
  const tipX = bubbleTip.x;
  const rawTipY = Math.max(boxBottom + 24, bubbleTip.y);
  const tipY = boxBottom + (rawTipY - boxBottom) * sendPointerOpacity;
  const showPointer = sendPointerOpacity > 0.02;

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

  const bubblePath = showPointer
    ? [
        `M ${boxLeft} ${boxTop}`,
        `L ${boxRight} ${boxTop}`,
        `L ${boxRight} ${boxBottom}`,
        `L ${baseRightX} ${boxBottom}`,
        `L ${tipX} ${tipY}`,
        `L ${baseLeftX} ${boxBottom}`,
        `L ${boxLeft} ${boxBottom}`,
        "Z",
      ].join(" ")
    : [
        `M ${boxLeft} ${boxTop}`,
        `L ${boxRight} ${boxTop}`,
        `L ${boxRight} ${boxBottom}`,
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
      style={
        hudOpacity < 1
          ? { opacity: visible && !isFadingOut ? hudOpacity : 0 }
          : undefined
      }
      className={`pointer-events-none fixed inset-0 ${
        sendMoveT > 0.01 ? "z-25" : "z-15"
      } ${
        hudOpacity < 1 ? "" : "transition-opacity duration-250 ease-out"
      } ${
        hudOpacity < 1
          ? ""
          : isActuallyVisible
          ? "opacity-100"
          : "opacity-0"
      }`}
      aria-hidden={!isActuallyVisible}
    >
      {/* 對話框虛線外框、四角粗線/圓點加強、轉折節點與指向模型上方的動態尖角 */}
      <svg
        className="h-full w-full overflow-visible"
        shapeRendering="geometricPrecision"
      >
        {/* 深色實心底面 */}
        <path d={bubblePath} fill={fillColor} stroke="none" />

        {/* 白色虛線外框與轉角／標題（階段三與七段數字同步閃爍） */}
        <g style={{ opacity: sendBlinkOpacity }}>
          <path
            d={bubblePath}
            fill="none"
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

          {/* 底部尖角開口與末端瞄準節點 */}
          {showPointer && (
            <g style={{ opacity: sendPointerOpacity }}>
              <circle cx={baseLeftX} cy={boxBottom} r="2.2" fill={strokeColor} />
              <circle cx={baseRightX} cy={boxBottom} r="2.2" fill={strokeColor} />
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
            </g>
          )}

          {/* 框線上方微縮遙測標記與「傳送訊息內容」標題 */}
          <text
            x={boxLeft + 4}
            y={boxTop - 5}
            fill={secondaryStroke}
            fontSize="8.5"
            fontFamily="monospace"
            letterSpacing="0.1em"
          >
            SEG // 01-08 · 傳送訊息內容
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
        </g>
      </svg>

      {/* 對話框內的八個 2D 小七段顯示器圖示（階段三同步閃爍） */}
      <div
        style={{
          left: `${boxLeft}px`,
          top: `${boxTop}px`,
          width: `${boxWidth}px`,
          height: `${boxHeight}px`,
          opacity: sendBlinkOpacity,
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
