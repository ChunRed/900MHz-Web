import { SEGMENT_2D_COLORS } from "@/components/constants/sevenSegments";

// 依標準 a, b, c, d, e, f, g 順序定義七段多邊形座標 (viewBox: 0 0 40 68)
const SEGMENT_POLYGONS = [
  "8,4 32,4 35,7 32,10 8,10 5,7",       // a: 上段 (Top)
  "33,8 36,11 36,31 33,34 30,31 30,11", // b: 右上段 (Top-Right)
  "33,34 36,37 36,57 33,60 30,57 30,37",// c: 右下段 (Bottom-Right)
  "8,58 32,58 35,61 32,64 8,64 5,61",   // d: 下段 (Bottom)
  "7,34 10,37 10,57 7,60 4,57 4,37",    // e: 左下段 (Bottom-Left)
  "7,8 10,11 10,31 7,34 4,31 4,11",     // f: 左上段 (Top-Left)
  "8,31 32,31 35,34 32,37 8,37 5,34",   // g: 中段 (Middle)
];

export function SevenSegmentDigit2D({
  segments = [0, 0, 0, 0, 0, 0, 0],
  className = "h-11 w-6 sm:h-12 sm:w-7",
}) {
  return (
    <svg
      viewBox="0 0 40 68"
      className={`overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      {SEGMENT_POLYGONS.map((points, idx) => {
        const isLit = Boolean(segments[idx]);
        return (
          <polygon
            key={idx}
            points={points}
            fill={isLit ? SEGMENT_2D_COLORS.on : SEGMENT_2D_COLORS.off}
            style={
              isLit
                ? {
                    filter: "drop-shadow(0 0 4px rgba(255, 225, 150, 0.85))",
                  }
                : undefined
            }
            className="transition-colors duration-200"
          />
        );
      })}
    </svg>
  );
}

export default function SevenSegmentRow2D({
  segmentMatrix = [],
  digitClassName = "h-11 w-6 sm:h-12 sm:w-7",
  gapClassName = "gap-2 sm:gap-3",
}) {
  return (
    <div className={`flex items-center justify-center ${gapClassName}`}>
      {segmentMatrix.map((digitSegments, digitIdx) => (
        <SevenSegmentDigit2D
          key={digitIdx}
          segments={digitSegments}
          className={digitClassName}
        />
      ))}
    </div>
  );
}
