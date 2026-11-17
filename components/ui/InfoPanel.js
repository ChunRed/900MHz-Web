import { useState } from "react";
import {
  BIG_SEGMENT_ACTIVE_STYLE,
  SMALL_SEGMENT_ACTIVE_STYLE,
} from "@/components/constants/sevenSegments";

export default function InfoPanel({
  cameraInfo,
  lightInfo,
  bigGlowIntensity,
  smallGlowIntensity,
  isDarkMode,
  showProjectionFrame,
  projectionFrameMode,
  mosaicEnabled,
  mosaicCellSize,
  mosaicThreshold,
  mosaicSpeed,
  onUpdateLightAngles,
  onResetLight,
  onChangeBigGlow,
  onChangeSmallGlow,
  onResetGlow,
  onToggleProjectionFrame,
  onChangeProjectionFrameMode,
  onToggleMosaic,
  onChangeMosaicCellSize,
  onChangeMosaicThreshold,
  onChangeMosaicSpeed,
  onResetMosaic,
}) {
  const [showInfo, setShowInfo] = useState(false);

  const highlightText = isDarkMode ? "text-zinc-200" : "text-zinc-900";
  const borderSubtle = isDarkMode ? "border-zinc-800" : "border-zinc-100";
  const sliderClass = `h-1.5 w-full cursor-pointer appearance-none rounded-lg ${
    isDarkMode ? "bg-zinc-700 accent-zinc-300" : "bg-zinc-200 accent-zinc-800"
  }`;

  return (
    <div className="fixed top-4 right-4 z-20 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setShowInfo((prev) => !prev)}
        aria-label="Toggle Camera & Light Info"
        title="相機與光線狀態資訊"
        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-all active:scale-95 ${
          isDarkMode
            ? "border-zinc-700/80 bg-zinc-900/85 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            : "border-zinc-800 bg-zinc-900 text-white hover:bg-black"
        }`}
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
        <div
          className={`w-72 max-h-[82vh] overflow-y-auto rounded-lg border px-4 py-3 font-mono text-xs shadow-md backdrop-blur-sm space-y-3 transition-colors duration-300 ${
            isDarkMode
              ? "border-zinc-800 bg-zinc-900/95 text-zinc-400"
              : "border-zinc-200 bg-white/95 text-zinc-700"
          }`}
        >
          {/* 相機狀態區塊 */}
          <div className="space-y-1.5">
            <div
              className={`font-semibold border-b pb-1 ${highlightText} ${borderSubtle}`}
            >
              相機狀態 (Camera Info)
            </div>
            <div>
              水平旋轉角 (Azimuth):{" "}
              <span className={`font-semibold ${highlightText}`}>
                {cameraInfo.azimuth}°
              </span>
            </div>
            <div>
              垂直俯仰角 (Polar):{" "}
              <span className={`font-semibold ${highlightText}`}>
                {cameraInfo.polar}°
              </span>
            </div>
            <div>
              Euler 旋轉 (X / Y / Z):{" "}
              <span className={`font-semibold ${highlightText}`}>
                {cameraInfo.rotX}° / {cameraInfo.rotY}° / {cameraInfo.rotZ}°
              </span>
            </div>
            <div>
              縮放幅度 (Zoom):{" "}
              <span className={`font-semibold ${highlightText}`}>
                {cameraInfo.zoomPercent}%
              </span>{" "}
              <span className={isDarkMode ? "text-zinc-500" : "text-zinc-400"}>
                (距離: {cameraInfo.distance})
              </span>
            </div>
          </div>

          {/* 光線控制與狀態區塊 */}
          <div
            className={`space-y-2 border-t pt-2.5 ${
              isDarkMode ? "border-zinc-800" : "border-zinc-200"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-1 ${borderSubtle}`}
            >
              <span className={`font-semibold ${highlightText}`}>
                光線狀態與控制 (Light Info)
              </span>
              <button
                type="button"
                onClick={onResetLight}
                className={`cursor-pointer rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                  isDarkMode
                    ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                }`}
              >
                重置
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>水平角度 (Azimuth):</span>
                <span className={`font-semibold ${highlightText}`}>
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
                className={sliderClass}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>垂直仰角 (Polar):</span>
                <span className={`font-semibold ${highlightText}`}>
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
                className={sliderClass}
              />
            </div>

            <div className="pt-0.5">
              光源位置 (X / Y / Z):{" "}
              <span className={`font-semibold ${highlightText}`}>
                {lightInfo.posX} / {lightInfo.posY} / {lightInfo.posZ}
              </span>
            </div>
          </div>

          {/* 大小七段顯示器光暈強度控制區塊 */}
          <div
            className={`space-y-2 border-t pt-2.5 ${
              isDarkMode ? "border-zinc-800" : "border-zinc-200"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-1 ${borderSubtle}`}
            >
              <span className={`font-semibold ${highlightText}`}>
                光暈強度控制 (Glow)
              </span>
              <button
                type="button"
                onClick={onResetGlow}
                title={`重置為預設 (${Math.round(
                  BIG_SEGMENT_ACTIVE_STYLE.defaultIntensity * 100
                )}% / ${Math.round(
                  SMALL_SEGMENT_ACTIVE_STYLE.defaultIntensity * 100
                )}%)`}
                className={`cursor-pointer rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                  isDarkMode
                    ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                }`}
              >
                重置
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>大七段顯示器光暈:</span>
                <span className={`font-semibold ${highlightText}`}>
                  {Math.round(bigGlowIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={bigGlowIntensity}
                onChange={(e) => onChangeBigGlow(parseFloat(e.target.value))}
                className={sliderClass}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>小七段顯示器光暈:</span>
                <span className={`font-semibold ${highlightText}`}>
                  {Math.round(smallGlowIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={smallGlowIntensity}
                onChange={(e) => onChangeSmallGlow(parseFloat(e.target.value))}
                className={sliderClass}
              />
            </div>
          </div>

          {/* 外輪廓投影框控制區塊 */}
          <div
            className={`space-y-2 border-t pt-2.5 ${
              isDarkMode ? "border-zinc-800" : "border-zinc-200"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-1 ${borderSubtle}`}
            >
              <span className={`font-semibold ${highlightText}`}>
                外輪廓投影框 (Outline)
              </span>
              <button
                type="button"
                onClick={onToggleProjectionFrame}
                className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  showProjectionFrame
                    ? isDarkMode
                      ? "bg-zinc-800 text-white border border-zinc-700"
                      : "bg-zinc-200 text-zinc-900 border border-zinc-300"
                    : isDarkMode
                    ? "text-zinc-500 hover:text-zinc-300"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {showProjectionFrame ? "顯示中" : "已關閉"}
              </button>
            </div>

            {showProjectionFrame && (
              <div className="flex items-center justify-between gap-1 pt-0.5 text-[11px]">
                <span
                  className={isDarkMode ? "text-zinc-400" : "text-zinc-600"}
                >
                  樣式:
                </span>
                <div className="flex gap-1">
                  {[
                    { id: "box", label: "矩形框" },
                    { id: "hull", label: "輪廓線" },
                    { id: "both", label: "二者" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onChangeProjectionFrameMode(item.id)}
                      className={`cursor-pointer rounded px-2 py-0.5 text-[10px] transition-colors ${
                        projectionFrameMode === item.id
                          ? isDarkMode
                            ? "bg-zinc-100 text-zinc-900 font-semibold"
                            : "bg-zinc-900 text-white font-semibold"
                          : isDarkMode
                          ? "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                          : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 數位馬賽克後處理 Uniform 控制區塊 */}
          <div
            className={`space-y-2 border-t pt-2.5 ${
              isDarkMode ? "border-zinc-800" : "border-zinc-200"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-1 ${borderSubtle}`}
            >
              <span className={`font-semibold ${highlightText}`}>
                數據網格濾鏡 (Mosaic)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onResetMosaic}
                  className={`cursor-pointer rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                    isDarkMode
                      ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  }`}
                >
                  重置
                </button>
                <button
                  type="button"
                  onClick={onToggleMosaic}
                  className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    mosaicEnabled
                      ? isDarkMode
                        ? "bg-zinc-800 text-white border border-zinc-700"
                        : "bg-zinc-200 text-zinc-900 border border-zinc-300"
                      : isDarkMode
                      ? "text-zinc-500 hover:text-zinc-300"
                      : "text-zinc-400 hover:text-zinc-600"
                  }`}
                >
                  {mosaicEnabled ? "開啟" : "關閉"}
                </button>
              </div>
            </div>

            {mosaicEnabled && (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>網格大小 (uCellSize):</span>
                    <span className={`font-semibold ${highlightText}`}>
                      {mosaicCellSize.toFixed(0)} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="48"
                    step="2"
                    value={mosaicCellSize}
                    onChange={(e) =>
                      onChangeMosaicCellSize(parseFloat(e.target.value))
                    }
                    className={sliderClass}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>數字門檻 (uThreshold):</span>
                    <span className={`font-semibold ${highlightText}`}>
                      {mosaicThreshold.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.95"
                    step="0.02"
                    value={mosaicThreshold}
                    onChange={(e) =>
                      onChangeMosaicThreshold(parseFloat(e.target.value))
                    }
                    className={sliderClass}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>跳動速度 (uSpeed):</span>
                    <span className={`font-semibold ${highlightText}`}>
                      {mosaicSpeed.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={mosaicSpeed}
                    onChange={(e) =>
                      onChangeMosaicSpeed(parseFloat(e.target.value))
                    }
                    className={sliderClass}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
