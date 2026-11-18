import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import TelephoneCanvas from "@/components/scene/TelephoneCanvas";
import HeaderTitle from "@/components/ui/HeaderTitle";
import BackButton from "@/components/ui/BackButton";
import FooterText from "@/components/ui/FooterText";
import SideArrowButtons from "@/components/ui/SideArrowButtons";
import ThemeToggleButton from "@/components/ui/ThemeToggleButton";
import ActiveDigitPointer from "@/components/ui/ActiveDigitPointer";
import ModelProjectionFrame from "@/components/ui/ModelProjectionFrame";
import ClickModelHint from "@/components/ui/ClickModelHint";
import SegmentInputHint from "@/components/ui/SegmentInputHint";
import SendResultModal from "@/components/ui/SendResultModal";
import MainSevenSegmentBubble from "@/components/ui/MainSevenSegmentBubble";
import OnboardingGuideModal from "@/components/ui/OnboardingGuideModal";
import AuthorInfoButton from "@/components/ui/AuthorInfoButton";
import DatasheetOverlay from "@/components/ui/DatasheetOverlay";
import { MOSAIC_DEFAULTS } from "@/components/shaders/mosaicNumericShader";
import {
  BIG_SEGMENT_ACTIVE_STYLE,
  SMALL_DIGIT_COUNT,
  SMALL_SEGMENT_ACTIVE_STYLE,
} from "@/components/constants/sevenSegments";

const createEmptySegmentMatrix = () =>
  Array.from({ length: SMALL_DIGIT_COUNT }, () => Array(7).fill(0));

const smoothStep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const DATASHEET_TRANSITION_MS = 1350;

export default function Home() {
  const resetViewRef = useRef(null);
  const focusViewRef = useRef(null);
  const mainLightRef = useRef(null);
  const datasheetRafRef = useRef(null);

  // 初始畫面預設為夜間模式，並顯示初始操作說明視窗
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [isCameraSettled, setIsCameraSettled] = useState(false);
  const [arrowPositions, setArrowPositions] = useState(null);
  const [digitPointerPositions, setDigitPointerPositions] = useState(null);
  const [bottomSegmentPos, setBottomSegmentPos] = useState(null);
  // 目前聯動的小七段顯示器索引 (0 ~ 7，對應第 1 ~ 8 個小七段顯示器)
  const [activeDigitIndex, setActiveDigitIndex] = useState(0);

  // 小七段顯示器亮起狀態陣列（8x7 0/1 矩陣）與提示關閉 / 傳送彈窗狀態
  const [segmentMatrix, setSegmentMatrix] = useState(createEmptySegmentMatrix);
  const [isInputHintFadingOut, setIsInputHintFadingOut] = useState(false);
  const [hasDismissedInputHint, setHasDismissedInputHint] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  // 外輪廓投影框狀態 (即時投影座標與凸包、點擊模型淡出狀態)
  const [projectionFrameData, setProjectionFrameData] = useState(null);
  const [isFrameFadingOut, setIsFrameFadingOut] = useState(false);

  // Datasheet 統一轉場進度 (0 = 主畫面, 1 = 純黑 Datasheet 閱讀模式) 與防連點鎖定
  const [datasheetProgress, setDatasheetProgress] = useState(0);
  const [isTransitioningDatasheet, setIsTransitioningDatasheet] =
    useState(false);
  const [datasheetDirection, setDatasheetDirection] = useState("idle"); // "idle" | "enter" | "exit"

  const runDatasheetTransition = (target) => {
    if (isTransitioningDatasheet) return;
    if (target === 1 && datasheetProgress >= 1) return;
    if (target === 0 && datasheetProgress <= 0) return;

    const from = datasheetProgress;
    const startTime = performance.now();
    setDatasheetDirection(target === 1 ? "enter" : "exit");
    setIsTransitioningDatasheet(true);

    if (datasheetRafRef.current) {
      cancelAnimationFrame(datasheetRafRef.current);
    }

    const step = (now) => {
      const elapsed = now - startTime;
      const rawT = Math.min(1, elapsed / DATASHEET_TRANSITION_MS);
      const nextProgress = from + (target - from) * rawT;
      setDatasheetProgress(nextProgress);

      if (rawT < 1) {
        datasheetRafRef.current = requestAnimationFrame(step);
      } else {
        setDatasheetProgress(target);
        setIsTransitioningDatasheet(false);
        setDatasheetDirection("idle");
        datasheetRafRef.current = null;
      }
    };

    datasheetRafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => {
      if (datasheetRafRef.current) {
        cancelAnimationFrame(datasheetRafRef.current);
      }
    };
  }, []);

  const handleSelectPrevDigit = () => {
    setActiveDigitIndex(
      (prev) => (prev - 1 + SMALL_DIGIT_COUNT) % SMALL_DIGIT_COUNT
    );
  };

  const handleSelectNextDigit = () => {
    setActiveDigitIndex((prev) => (prev + 1) % SMALL_DIGIT_COUNT);
  };

  useEffect(() => {
    if (!isInputHintFadingOut) return;
    const timer = setTimeout(() => {
      setHasDismissedInputHint(true);
      setIsInputHintFadingOut(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [isInputHintFadingOut]);

  const handleSegmentMatrixChange = (nextMatrix, nextActive) => {
    setSegmentMatrix(nextMatrix);
    if (nextActive && !hasDismissedInputHint && !isInputHintFadingOut) {
      setIsInputHintFadingOut(true);
    }
  };

  // 由單一對稱進度變數衍生的主畫面 HUD / Datasheet 透明度與按鈕狀態
  const hudOpacity = 1 - smoothStep(0.35, 0.72, datasheetProgress);
  const datasheetOpacity =
    datasheetDirection === "exit" && datasheetProgress < 0.92
      ? Math.max(0, smoothStep(0.86, 1.0, datasheetProgress))
      : smoothStep(0.78, 1.0, datasheetProgress);
  const isDatasheetButtonBack =
    datasheetDirection === "exit"
      ? false
      : datasheetProgress >= 0.72;
  const isDatasheetActive = datasheetProgress > 0.01;
  const canvasOpacity = 1 - smoothStep(0.78, 0.86, datasheetProgress);

  const morphT = smoothStep(0.15, 0.78, datasheetProgress);
  const morphedFrameData = (() => {
    if (!projectionFrameData?.box) return projectionFrameData;
    const frameBox = projectionFrameData.box;
    const vw =
      projectionFrameData.bubbleTip?.viewportWidth ||
      (typeof window !== "undefined" ? window.innerWidth : 390);
    const vh = typeof window !== "undefined" ? window.innerHeight : 844;

    const targetWidth = Math.min(460, vw - 36);
    const targetHeight = Math.min(340, Math.max(220, vh - 310));
    const targetX = (vw - targetWidth) / 2;
    const targetY = Math.max(198, (vh - targetHeight) * 0.54);

    const lerp = (a, b, t) => a + (b - a) * t;
    const activeBox = {
      x: lerp(frameBox.x, targetX, morphT),
      y: lerp(frameBox.y, targetY, morphT),
      width: lerp(frameBox.width, targetWidth, morphT),
      height: lerp(frameBox.height, targetHeight, morphT),
    };

    const activeBubbleTip = projectionFrameData.bubbleTip
      ? {
          ...projectionFrameData.bubbleTip,
          x: lerp(
            projectionFrameData.bubbleTip.x,
            activeBox.x + activeBox.width / 2,
            morphT
          ),
          y: lerp(projectionFrameData.bubbleTip.y, activeBox.y, morphT),
        }
      : projectionFrameData.bubbleTip;

    return {
      ...projectionFrameData,
      box: activeBox,
      bubbleTip: activeBubbleTip,
    };
  })();

  return (
    <>
      <Head>
        <title>900MHz</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="theme-color"
          content={isDarkMode ? "#000000" : "#ffffff"}
        />
      </Head>
      <main
        className={`relative w-screen h-screen overflow-hidden transition-colors duration-300 ${
          isDarkMode ? "bg-black" : "bg-white"
        }`}
      >
        {/* 3D 電話模型與七段顯示器互動場景 */}
        <div
          className="w-full h-full"
          style={{
            opacity: canvasOpacity,
            pointerEvents: isDatasheetActive ? "none" : "auto",
          }}
        >
          <TelephoneCanvas
          isFocused={isFocused}
          isDarkMode={isDarkMode}
          activeDigitIndex={activeDigitIndex}
          bigGlowIntensity={BIG_SEGMENT_ACTIVE_STYLE.defaultIntensity}
          smallGlowIntensity={SMALL_SEGMENT_ACTIVE_STYLE.defaultIntensity}
          mosaicEnabled
          mosaicCellSize={MOSAIC_DEFAULTS.cellSize}
          mosaicThreshold={MOSAIC_DEFAULTS.threshold}
          mosaicSpeed={MOSAIC_DEFAULTS.speed}
          datasheetProgress={datasheetProgress}
          setIsFocused={setIsFocused}
          setIsCameraSettled={setIsCameraSettled}
          setIsFrameFadingOut={setIsFrameFadingOut}
          setArrowPositions={setArrowPositions}
          setDigitPointerPositions={setDigitPointerPositions}
          setBottomSegmentPos={setBottomSegmentPos}
          onUpdateProjectionFrame={setProjectionFrameData}
          onSegmentMatrixChange={handleSegmentMatrixChange}
          mainLightRef={mainLightRef}
          resetViewRef={resetViewRef}
          focusViewRef={focusViewRef}
        />
        </div>

        {/* 相機視角看向模型的外輪廓投影框（科技風細線與節點，點擊模型時先fadeout消失才開運鏡，進入 Datasheet 時轉為資訊外框） */}
        <ModelProjectionFrame
          frameData={morphedFrameData}
          visible={!isFocused}
          isFadingOut={isFrameFadingOut}
          isDarkMode={isDarkMode}
          hudOpacity={1}
          hullOpacity={hudOpacity}
          labelText={datasheetProgress >= 0.5 ? "DOC // 900.0" : "PROJ // 900.0"}
          mode="both"
        />

        {/* 主畫面「Click 點擊」提示標示（左斜上拉出細線＋標籤，點擊模型時與投影框同步 fadeout） */}
        <ClickModelHint
          frameData={projectionFrameData}
          visible={!isFocused}
          isFadingOut={isFrameFadingOut}
          isDarkMode={isDarkMode}
          hudOpacity={hudOpacity}
          disabled={isTransitioningDatasheet || isDatasheetActive}
          onClickModel={() => {
            if (!isTransitioningDatasheet && !isDatasheetActive) {
              focusViewRef.current?.();
            }
          }}
        />

        {/* 畫面左上角日 / 夜間模式切換按鈕 */}
        <ThemeToggleButton
          isDarkMode={isDarkMode}
          hudOpacity={1}
          disabled={isTransitioningDatasheet}
          onToggle={() => setIsDarkMode((prev) => !prev)}
        />

        {/* 畫面上方作品標題 */}
        <HeaderTitle isDarkMode={isDarkMode} hudOpacity={1} />

        {/* 主畫面上方八個 2D 小七段顯示器對話框（細框線指向模型上方，尖角隨視角轉動即時調整） */}
        <MainSevenSegmentBubble
          segmentMatrix={segmentMatrix}
          frameData={morphedFrameData}
          visible={!isFocused}
          isFadingOut={isFrameFadingOut}
          isDarkMode={isDarkMode}
          hudOpacity={1}
        />

        {/* 指向目前所選小七段顯示器的上下飄動箭頭 */}
        <ActiveDigitPointer
          visible={isCameraSettled && !isDatasheetActive}
          positions={digitPointerPositions}
          activeDigitIndex={activeDigitIndex}
          isDarkMode={isDarkMode}
        />

        {/* 相機到達定位且尚未有任何輸入時，指向大七段中間段往右上斜的雙語輸入提示 */}
        <SegmentInputHint
          anchorPos={bottomSegmentPos}
          visible={isCameraSettled && !hasDismissedInputHint && !isDatasheetActive}
          isFadingOut={isInputHintFadingOut}
          isDarkMode={isDarkMode}
        />

        {/* 相機到達定點後，顯示於大七段顯示器左右兩側的箭頭按鈕 */}
        <SideArrowButtons
          visible={isCameraSettled && !isDatasheetActive}
          positions={arrowPositions}
          isDarkMode={isDarkMode}
          onClickLeft={handleSelectPrevDigit}
          onClickRight={handleSelectNextDigit}
        />

        {/* 右下角作者 / 資訊按鈕（點擊進入 Datasheet 頁面轉場） */}
        {!isFocused && (
          <AuthorInfoButton
            isDarkMode={isDarkMode}
            hudOpacity={hudOpacity}
            disabled={isTransitioningDatasheet || isDatasheetActive}
            onClick={() => runDatasheetTransition(1)}
          />
        )}

        {/* 「資訊 | datasheet」閱讀模式介面（直接顯示於外框內） */}
        <DatasheetOverlay
          opacity={datasheetOpacity}
          box={morphedFrameData?.box}
          isDarkMode={isDarkMode}
          onOpenGuide={() => setShowOnboardingGuide(true)}
        />

        {/* 畫面下方科技分格按鈕（主畫面為 [▲03 | Send 傳送]，聚焦或 Datasheet 模式轉變為 [◄ | Back 返回]） */}
        <BackButton
          isFocused={isFocused}
          isDatasheetButtonBack={isDatasheetButtonBack}
          isDatasheetView={datasheetProgress >= 0.4}
          isTransitioning={isTransitioningDatasheet}
          isDarkMode={isDarkMode}
          onBack={() => {
            if (isDatasheetActive) {
              runDatasheetTransition(0);
            } else {
              resetViewRef.current?.();
            }
          }}
          onSend={() => setIsSendModalOpen(true)}
        />

        {/* 傳送內容通知彈窗（未輸入時提示請輸入內容，已輸入時顯示 8x7 小七段亮起狀態與陣列） */}
        <SendResultModal
          visible={isSendModalOpen}
          segmentMatrix={segmentMatrix}
          isDarkMode={isDarkMode}
          onClose={() => setIsSendModalOpen(false)}
        />

        {/* 初始操作說明畫面（確認後上下壓縮收合退場） */}
        <OnboardingGuideModal
          visible={showOnboardingGuide}
          isDarkMode={isDarkMode}
          onClose={() => setShowOnboardingGuide(false)}
        />

        {/* 畫面最下方署名小灰字 */}
        <FooterText isDarkMode={isDarkMode || datasheetProgress >= 0.4} />
      </main>
    </>
  );
}
