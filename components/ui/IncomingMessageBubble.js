import { useEffect, useRef, useState } from "react";
import SevenSegmentRow2D from "@/components/ui/SevenSegmentRow2D";

const AUTO_DISMISS_MS = 3000;
const EXIT_ANIMATION_MS = 380;

export default function IncomingMessageBubble({
  messageMatrix = null,
  messageSeq = 0,
  frameData,
  visible = true,
  isFadingOut = false,
  isDarkMode = true,
  hudOpacity = 1,
  onDismiss,
}) {
  const [exitingSeq, setExitingSeq] = useState(null);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!messageMatrix) return undefined;

    const holdTimer = setTimeout(() => {
      setExitingSeq(messageSeq);
    }, AUTO_DISMISS_MS);

    const dismissTimer = setTimeout(() => {
      onDismissRef.current?.();
    }, AUTO_DISMISS_MS + EXIT_ANIMATION_MS);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(dismissTimer);
    };
  }, [messageMatrix, messageSeq]);

  if (!messageMatrix) return null;

  const isExiting = exitingSeq === messageSeq;
  const isActuallyVisible = visible && !isFadingOut && hudOpacity > 0.01;
  const viewportWidth =
    frameData?.bubbleTip?.viewportWidth ||
    (typeof window !== "undefined" ? window.innerWidth : 390);
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 844;
  const centerX = viewportWidth * 0.5;

  // 對話框外框尺寸與位置（精巧縮小、靠左側對齊，避開底部傳送鈕與右下資訊鈕）
  const boxWidth = Math.min(218, Math.max(194, viewportWidth - 140));
  const boxHeight = 46;
  const boxLeft = 14;
  const boxRight = boxLeft + boxWidth;
  const boxBottom = viewportHeight - 106;
  const boxTop = boxBottom - boxHeight;
  const cornerLen = 8;

  // 對話框上方尖角動態指向 3D 播報器模型中下方
  const modelBox = frameData?.box;
  const tipX = modelBox
    ? Math.max(
        boxLeft + 24,
        Math.min(viewportWidth - 48, modelBox.x + modelBox.width * 0.45)
      )
    : centerX;
  const tipY = modelBox
    ? Math.min(
        boxTop - 24,
        Math.max(220, modelBox.y + modelBox.height * 0.62)
      )
    : boxTop - 42;

  const halfBase = 12;
  const boxCenterX = boxLeft + boxWidth * 0.5;
  const baseCenterX = Math.max(
    boxLeft + cornerLen + halfBase + 6,
    Math.min(
      boxRight - cornerLen - halfBase - 6,
      boxCenterX + (tipX - boxCenterX) * 0.45
    )
  );
  const baseLeftX = baseCenterX - halfBase;
  const baseRightX = baseCenterX + halfBase;

  const bubblePath = [
    `M ${boxLeft} ${boxTop}`,
    `L ${baseLeftX} ${boxTop}`,
    `L ${tipX} ${tipY}`,
    `L ${baseRightX} ${boxTop}`,
    `L ${boxRight} ${boxTop}`,
    `L ${boxRight} ${boxBottom}`,
    `L ${boxLeft} ${boxBottom}`,
    "Z",
  ].join(" ");

  // 與 MainSevenSegmentBubble 統一的日夜間高對比配色
  const strokeColor = isDarkMode ? "#dddddd" : "#18181b";
  const secondaryStroke = isDarkMode ? "#888888" : "#52525b";
  const accentColor = "#ffe196";
  const fillColor = isDarkMode
    ? "rgba(10, 10, 12, 0.84)"
    : "rgba(24, 24, 27, 0.94)";

  const corners = [
    { x: boxLeft, y: boxTop, dx: 1, dy: 1 },
    { x: boxRight, y: boxTop, dx: -1, dy: 1 },
    { x: boxLeft, y: boxBottom, dx: 1, dy: -1 },
    { x: boxRight, y: boxBottom, dx: -1, dy: -1 },
  ];

  // 以對話框中心點作為縮放收合原點
  const originX = boxLeft + boxWidth * 0.5;
  const originY = boxTop + boxHeight * 0.5;

  return (
    <div
      key={messageSeq}
      style={{
        opacity:
          hudOpacity < 1
            ? visible && !isFadingOut
              ? hudOpacity
              : 0
            : undefined,
      }}
      className={`pointer-events-none fixed inset-0 z-20 ${
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
      <style jsx>{`
        @keyframes rxBubbleIn {
          from {
            opacity: 0;
            transform: scale(0.86);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes rxBubbleOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.72);
          }
        }
      `}</style>

      <div
        style={{
          transformOrigin: `${originX}px ${originY}px`,
          animation: isExiting
            ? `rxBubbleOut ${EXIT_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`
            : "rxBubbleIn 260ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
        className="fixed inset-0"
      >
        {/* 對話框虛線外框、四角粗線/圓點加強與指向上方模型的動態尖角 */}
        <svg
          className="h-full w-full overflow-visible"
          shapeRendering="geometricPrecision"
        >
          <path
            d={bubblePath}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.1"
            strokeDasharray="4.5 3"
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
                strokeWidth="2"
                strokeLinecap="square"
              />
              <rect
                x={c.x - 1.6}
                y={c.y - 1.6}
                width="3.2"
                height="3.2"
                fill={strokeColor}
              />
            </g>
          ))}

          {/* 頂部尖角開口兩側轉折處：圓點加強 */}
          <circle cx={baseLeftX} cy={boxTop} r="2" fill={strokeColor} />
          <circle cx={baseRightX} cy={boxTop} r="2" fill={strokeColor} />

          {/* 尖角末端瞄準節點：實心暖黃圓點 + 追蹤小方框 */}
          <rect
            x={tipX - 3}
            y={tipY - 3}
            width="6"
            height="6"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1"
          />
          <circle cx={tipX} cy={tipY} r="1.8" fill={accentColor} />

          {/* 框線下方遙測標記與新訊息提示文字 */}
          <circle
            cx={boxLeft + 4.5}
            cy={boxBottom + 8.5}
            r="2"
            fill={accentColor}
          />
          <text
            x={boxLeft + 10}
            y={boxBottom + 11}
            fill={secondaryStroke}
            fontSize="7.5"
            fontFamily="monospace"
            letterSpacing="0.06em"
          >
            RX // 收到其他使用者的新訊息
          </text>
          <text
            x={boxRight - 2}
            y={boxBottom + 11}
            fill={secondaryStroke}
            fontSize="7.5"
            fontFamily="monospace"
            textAnchor="end"
            letterSpacing="0.08em"
          >
            RX-BUF
          </text>
        </svg>

        {/* 對話框內的八個精巧 2D 小七段顯示器 */}
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
            segmentMatrix={messageMatrix}
            digitClassName="h-6 w-3.5 sm:h-7 sm:w-4"
            gapClassName="gap-1 sm:gap-1.5"
          />
        </div>
      </div>
    </div>
  );
}
