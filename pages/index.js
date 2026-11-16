import { useRef, useState } from "react";
import Head from "next/head";
import * as THREE from "three";
import TelephoneCanvas from "@/components/scene/TelephoneCanvas";
import HeaderTitle from "@/components/ui/HeaderTitle";
import InfoPanel from "@/components/ui/InfoPanel";
import BackButton from "@/components/ui/BackButton";
import FooterText from "@/components/ui/FooterText";
import SideArrowButtons from "@/components/ui/SideArrowButtons";
import ThemeToggleButton from "@/components/ui/ThemeToggleButton";
import ActiveDigitPointer from "@/components/ui/ActiveDigitPointer";
import ModelProjectionFrame from "@/components/ui/ModelProjectionFrame";
import {
  BIG_SEGMENT_ACTIVE_STYLE,
  SMALL_DIGIT_COUNT,
  SMALL_SEGMENT_ACTIVE_STYLE,
} from "@/components/constants/sevenSegments";

export default function Home() {
  const resetViewRef = useRef(null);
  const mainLightRef = useRef(null);
  const lightRadiusRef = useRef(Math.hypot(8, 12, 10));

  // 初始畫面預設為夜間模式
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [isCameraSettled, setIsCameraSettled] = useState(false);
  const [arrowPositions, setArrowPositions] = useState(null);
  const [digitPointerPositions, setDigitPointerPositions] = useState(null);
  // 目前聯動的小七段顯示器索引 (0 ~ 7，對應第 1 ~ 8 個小七段顯示器)
  const [activeDigitIndex, setActiveDigitIndex] = useState(0);

  // 外輪廓投影框狀態 (即時投影座標與凸包、顯示開關、樣式模式、點擊模型淡出狀態)
  const [projectionFrameData, setProjectionFrameData] = useState(null);
  const [showProjectionFrame, setShowProjectionFrame] = useState(true);
  const [projectionFrameMode, setProjectionFrameMode] = useState("both");
  const [isFrameFadingOut, setIsFrameFadingOut] = useState(false);

  // 大小七段顯示器光暈強度倍率
  const [bigGlowIntensity, setBigGlowIntensity] = useState(
    BIG_SEGMENT_ACTIVE_STYLE.defaultIntensity
  );
  const [smallGlowIntensity, setSmallGlowIntensity] = useState(
    SMALL_SEGMENT_ACTIVE_STYLE.defaultIntensity
  );

  const [cameraInfo, setCameraInfo] = useState({
    azimuth: "0.0",
    polar: "0.0",
    rotX: "0.0",
    rotY: "0.0",
    rotZ: "0.0",
    distance: "19.48",
    zoomPercent: "77",
  });
  const [lightInfo, setLightInfo] = useState({
    azimuth: 38.7,
    polar: 46.9,
    posX: "8.00",
    posY: "12.00",
    posZ: "10.00",
  });

  const handleSelectPrevDigit = () => {
    setActiveDigitIndex(
      (prev) => (prev - 1 + SMALL_DIGIT_COUNT) % SMALL_DIGIT_COUNT
    );
  };

  const handleSelectNextDigit = () => {
    setActiveDigitIndex((prev) => (prev + 1) % SMALL_DIGIT_COUNT);
  };

  const handleResetGlow = () => {
    setBigGlowIntensity(BIG_SEGMENT_ACTIVE_STYLE.defaultIntensity);
    setSmallGlowIntensity(SMALL_SEGMENT_ACTIVE_STYLE.defaultIntensity);
  };

  const updateLightByAngles = (azimuthDeg, polarDeg) => {
    const clampedPolar = Math.max(0.1, Math.min(179.9, polarDeg));
    const spherical = new THREE.Spherical(
      lightRadiusRef.current,
      THREE.MathUtils.degToRad(clampedPolar),
      THREE.MathUtils.degToRad(azimuthDeg)
    );
    const pos = new THREE.Vector3().setFromSpherical(spherical);

    if (mainLightRef.current) {
      mainLightRef.current.position.copy(pos);
    }

    const fmt = (v) => {
      const s = v.toFixed(2);
      return Number(s) === 0 ? "0.00" : s;
    };

    setLightInfo({
      azimuth: Number(azimuthDeg.toFixed(1)),
      polar: Number(polarDeg.toFixed(1)),
      posX: fmt(pos.x),
      posY: fmt(pos.y),
      posZ: fmt(pos.z),
    });
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
          bigGlowIntensity={bigGlowIntensity}
          smallGlowIntensity={smallGlowIntensity}
          setIsFocused={setIsFocused}
          setIsCameraSettled={setIsCameraSettled}
          setIsFrameFadingOut={setIsFrameFadingOut}
          setArrowPositions={setArrowPositions}
          setDigitPointerPositions={setDigitPointerPositions}
          setCameraInfo={setCameraInfo}
          onUpdateProjectionFrame={setProjectionFrameData}
          mainLightRef={mainLightRef}
          resetViewRef={resetViewRef}
        />

        {/* 相機視角看向模型的外輪廓投影框（0x999999細線條，點擊模型時先fadeout消失才開運鏡） */}
        <ModelProjectionFrame
          frameData={projectionFrameData}
          visible={showProjectionFrame && !isFocused}
          isFadingOut={isFrameFadingOut}
          mode={projectionFrameMode}
        />

        {/* 畫面左上角日 / 夜間模式切換按鈕 */}
        <ThemeToggleButton
          isDarkMode={isDarkMode}
          onToggle={() => setIsDarkMode((prev) => !prev)}
        />

        {/* 畫面上方作品標題 */}
        <HeaderTitle isDarkMode={isDarkMode} />

        {/* 指向目前所選小七段顯示器的上下飄動箭頭 */}
        <ActiveDigitPointer
          visible={isCameraSettled}
          positions={digitPointerPositions}
          activeDigitIndex={activeDigitIndex}
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

        {/* 畫面右上角相機、光線與光暈狀態控制面板 */}
        <InfoPanel
          cameraInfo={cameraInfo}
          lightInfo={lightInfo}
          bigGlowIntensity={bigGlowIntensity}
          smallGlowIntensity={smallGlowIntensity}
          isDarkMode={isDarkMode}
          showProjectionFrame={showProjectionFrame}
          projectionFrameMode={projectionFrameMode}
          onUpdateLightAngles={updateLightByAngles}
          onResetLight={() => updateLightByAngles(38.7, 46.9)}
          onChangeBigGlow={setBigGlowIntensity}
          onChangeSmallGlow={setSmallGlowIntensity}
          onResetGlow={handleResetGlow}
          onToggleProjectionFrame={() => setShowProjectionFrame((prev) => !prev)}
          onChangeProjectionFrameMode={setProjectionFrameMode}
        />

        {/* 畫面下方返回初始視角按鈕 */}
        <BackButton
          isFocused={isFocused}
          isDarkMode={isDarkMode}
          onBack={() => resetViewRef.current && resetViewRef.current()}
        />

        {/* 畫面最下方署名小灰字 */}
        <FooterText isDarkMode={isDarkMode} />
      </main>
    </>
  );
}
