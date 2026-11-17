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
import { MOSAIC_DEFAULTS } from "@/components/shaders/mosaicNumericShader";
import {
  BIG_SEGMENT_ACTIVE_STYLE,
  SMALL_DIGIT_COUNT,
  SMALL_SEGMENT_ACTIVE_STYLE,
} from "@/components/constants/sevenSegments";

const createEmptySegmentMatrix = () =>
  Array.from({ length: SMALL_DIGIT_COUNT }, () => Array(7).fill(0));

export default function Home() {
  const resetViewRef = useRef(null);
  const focusViewRef = useRef(null);
  const mainLightRef = useRef(null);

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

        {/* 相機視角看向模型的外輪廓投影框（科技風細線與節點，點擊模型時先fadeout消失才開運鏡） */}
        <ModelProjectionFrame
          frameData={projectionFrameData}
          visible={!isFocused}
          isFadingOut={isFrameFadingOut}
          isDarkMode={isDarkMode}
          mode="both"
        />

        {/* 主畫面「Click 點擊」提示標示（左斜上拉出細線＋標籤，點擊模型時與投影框同步 fadeout） */}
        <ClickModelHint
          frameData={projectionFrameData}
          visible={!isFocused}
          isFadingOut={isFrameFadingOut}
          isDarkMode={isDarkMode}
          onClickModel={() => focusViewRef.current && focusViewRef.current()}
        />

        {/* 畫面左上角日 / 夜間模式切換按鈕 */}
        <ThemeToggleButton
          isDarkMode={isDarkMode}
          onToggle={() => setIsDarkMode((prev) => !prev)}
        />

        {/* 畫面上方作品標題 */}
        <HeaderTitle isDarkMode={isDarkMode} />

        {/* 主畫面上方八個 2D 小七段顯示器對話框（細框線指向模型上方，尖角隨視角轉動即時調整） */}
        <MainSevenSegmentBubble
          segmentMatrix={segmentMatrix}
          frameData={projectionFrameData}
          visible={!isFocused}
          isFadingOut={isFrameFadingOut}
          isDarkMode={isDarkMode}
        />

        {/* 指向目前所選小七段顯示器的上下飄動箭頭 */}
        <ActiveDigitPointer
          visible={isCameraSettled}
          positions={digitPointerPositions}
          activeDigitIndex={activeDigitIndex}
          isDarkMode={isDarkMode}
        />

        {/* 相機到達定位且尚未有任何輸入時，指向大七段中間段往右上斜的雙語輸入提示 */}
        <SegmentInputHint
          anchorPos={bottomSegmentPos}
          visible={isCameraSettled && !hasDismissedInputHint}
          isFadingOut={isInputHintFadingOut}
          isDarkMode={isDarkMode}
        />

        {/* 相機到達定點後，顯示於大七段顯示器左右兩側的箭頭按鈕 */}
        <SideArrowButtons
          visible={isCameraSettled}
          positions={arrowPositions}
          isDarkMode={isDarkMode}
          onClickLeft={handleSelectPrevDigit}
          onClickRight={handleSelectNextDigit}
        />

        {/* 右下角作者資訊按鈕 */}
        <AuthorInfoButton isDarkMode={isDarkMode} />

        {/* 畫面下方膠囊形按鈕（主畫面為 Send 傳送鈕，點擊模型聚焦後轉變為 Back 按鈕） */}
        <BackButton
          isFocused={isFocused}
          isDarkMode={isDarkMode}
          onBack={() => resetViewRef.current && resetViewRef.current()}
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
        <FooterText isDarkMode={isDarkMode} />
      </main>
    </>
  );
}
