import { useRef, useState } from "react";
import Head from "next/head";
import * as THREE from "three";
import TelephoneCanvas from "@/components/scene/TelephoneCanvas";
import HeaderTitle from "@/components/ui/HeaderTitle";
import InfoPanel from "@/components/ui/InfoPanel";
import BackButton from "@/components/ui/BackButton";
import FooterText from "@/components/ui/FooterText";

export default function Home() {
  const resetViewRef = useRef(null);
  const mainLightRef = useRef(null);
  const lightRadiusRef = useRef(Math.hypot(8, 12, 10));

  const [isFocused, setIsFocused] = useState(false);
  const [activeSegment, setActiveSegment] = useState(null);
  const [cameraInfo, setCameraInfo] = useState({
    azimuth: "0.0",
    polar: "0.0",
    rotX: "0.0",
    rotY: "0.0",
    rotZ: "0.0",
    distance: "0.00",
    zoomPercent: "100",
  });
  const [lightInfo, setLightInfo] = useState({
    azimuth: 38.7,
    polar: 46.9,
    posX: "8.00",
    posY: "12.00",
    posZ: "10.00",
  });

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
      </Head>
      <main className="relative w-screen h-screen overflow-hidden bg-white">
        {/* 3D 電話模型與七段顯示器互動場景 */}
        <TelephoneCanvas
          isFocused={isFocused}
          setIsFocused={setIsFocused}
          setActiveSegment={setActiveSegment}
          setCameraInfo={setCameraInfo}
          mainLightRef={mainLightRef}
          resetViewRef={resetViewRef}
        />

        {/* 畫面上方作品標題與七段顯示器點擊資訊 */}
        <HeaderTitle activeSegment={activeSegment} />

        {/* 畫面右上角相機與光線狀態控制面板 */}
        <InfoPanel
          cameraInfo={cameraInfo}
          lightInfo={lightInfo}
          onUpdateLightAngles={updateLightByAngles}
          onResetLight={() => updateLightByAngles(38.7, 46.9)}
        />

        {/* 畫面下方返回初始視角按鈕 */}
        <BackButton
          isFocused={isFocused}
          onBack={() => resetViewRef.current && resetViewRef.current()}
        />

        {/* 畫面最下方署名小灰字 */}
        <FooterText />
      </main>
    </>
  );
}
