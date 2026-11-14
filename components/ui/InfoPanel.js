import { useState } from "react";

export default function InfoPanel({
  cameraInfo,
  lightInfo,
  onUpdateLightAngles,
  onResetLight,
}) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-20 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setShowInfo((prev) => !prev)}
        aria-label="Toggle Camera & Light Info"
        title="相機與光線狀態資訊"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-700 shadow-sm backdrop-blur-sm transition-all hover:bg-zinc-100 hover:text-zinc-900 active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      {showInfo && (
        <div className="w-72 rounded-lg border border-zinc-200 bg-white/95 px-4 py-3 font-mono text-xs text-zinc-700 shadow-md backdrop-blur-sm space-y-3">
          {/* 相機狀態區塊 */}
          <div className="space-y-1.5">
            <div className="font-semibold text-zinc-900 border-b border-zinc-100 pb-1">
              相機狀態 (Camera Info)
            </div>
            <div>
              水平旋轉角 (Azimuth):{" "}
              <span className="font-semibold text-zinc-900">
                {cameraInfo.azimuth}°
              </span>
            </div>
            <div>
              垂直俯仰角 (Polar):{" "}
              <span className="font-semibold text-zinc-900">
                {cameraInfo.polar}°
              </span>
            </div>
            <div>
              Euler 旋轉 (X / Y / Z):{" "}
              <span className="font-semibold text-zinc-900">
                {cameraInfo.rotX}° / {cameraInfo.rotY}° / {cameraInfo.rotZ}°
              </span>
            </div>
            <div>
              縮放幅度 (Zoom):{" "}
              <span className="font-semibold text-zinc-900">
                {cameraInfo.zoomPercent}%
              </span>{" "}
              <span className="text-zinc-400">(距離: {cameraInfo.distance})</span>
            </div>
          </div>

          {/* 光線控制與狀態區塊 */}
          <div className="space-y-2 border-t border-zinc-200 pt-2.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-1">
              <span className="font-semibold text-zinc-900">
                光線狀態與控制 (Light Info)
              </span>
              <button
                type="button"
                onClick={onResetLight}
                className="cursor-pointer rounded px-1.5 py-0.5 text-[10px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
              >
                重置
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>水平角度 (Azimuth):</span>
                <span className="font-semibold text-zinc-900">
                  {lightInfo.azimuth.toFixed(1)}°
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="0.5"
                value={lightInfo.azimuth}
                onChange={(e) =>
                  onUpdateLightAngles(
                    parseFloat(e.target.value),
                    lightInfo.polar
                  )
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-zinc-800"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>垂直仰角 (Polar):</span>
                <span className="font-semibold text-zinc-900">
                  {lightInfo.polar.toFixed(1)}°
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="179"
                step="0.5"
                value={lightInfo.polar}
                onChange={(e) =>
                  onUpdateLightAngles(
                    lightInfo.azimuth,
                    parseFloat(e.target.value)
                  )
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-zinc-800"
              />
            </div>

            <div className="pt-0.5">
              光源位置 (X / Y / Z):{" "}
              <span className="font-semibold text-zinc-900">
                {lightInfo.posX} / {lightInfo.posY} / {lightInfo.posZ}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

