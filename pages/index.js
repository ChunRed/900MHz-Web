import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { io } from "socket.io-client";
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
import MobileOnlyNotice from "@/components/ui/MobileOnlyNotice";
import IncomingMessageBubble from "@/components/ui/IncomingMessageBubble";
import { MOSAIC_DEFAULTS } from "@/components/shaders/mosaicNumericShader";
import {
  BIG_SEGMENT_ACTIVE_STYLE,
  SMALL_DIGIT_COUNT,
  SMALL_SEGMENT_ACTIVE_STYLE,
} from "@/components/constants/sevenSegments";

const createEmptySegmentMatrix = () =>
  Array.from({ length: SMALL_DIGIT_COUNT }, () => Array(7).fill(0));

const normalizeSegmentMatrix = (data) => {
  if (!Array.isArray(data)) return null;
  return Array.from({ length: SMALL_DIGIT_COUNT }, (_, digitIdx) => {
    const row = Array.isArray(data[digitIdx]) ? data[digitIdx] : [];
    return Array.from({ length: 7 }, (_, segIdx) => (row[segIdx] ? 1 : 0));
  });
};

const smoothStep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const DATASHEET_TRANSITION_MS = 1350;
const SEND_ENTER_MS = 2850;
const SEND_EXIT_MS = 1150;
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "https://900mhz-server.nosidehere.space";

const checkIsMobilePhone = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isTabletUA =
    /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isTabletUA) return false;

  const isPhoneUA =
    /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|Mobile Safari/i.test(
      ua
    );
  if (isPhoneUA) return true;

  return (
    window.innerWidth <= 768 &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
};

export default function Home() {
  const resetViewRef = useRef(null);
  const focusViewRef = useRef(null);
  const mainLightRef = useRef(null);
  const datasheetRafRef = useRef(null);
  const sendRafRef = useRef(null);
  const socketRef = useRef(null);
  const lastSelfSentRef = useRef(null);

  // 裝置檢測：null=尚未檢測、true=手機載體、false=非手機載體（顯示提示並鎖定）
  const [isMobileDevice, setIsMobileDevice] = useState(null);
  // 監聽 socket.io client_msg 收到的其他使用者新訊息
  const [incomingMessage, setIncomingMessage] = useState({
    matrix: null,
    seq: 0,
  });

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

  // Send 統一發送與反向還原時間軸進度 (0 = 主畫面, 1 = 傳送序列完成／顯示彈窗)
  const [sendProgress, setSendProgress] = useState(0);
  const [isTransitioningSend, setIsTransitioningSend] = useState(false);
  const [sendDirection, setSendDirection] = useState("idle"); // "idle" | "enter" | "exit"

  const runDatasheetTransition = (target) => {
    if (isTransitioningDatasheet || isTransitioningSend || sendProgress > 0.01) {
      return;
    }
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

  const runSendTransition = (target) => {
    if (isTransitioningSend || isTransitioningDatasheet || datasheetProgress > 0.01) {
      return;
    }
    if (target === 1 && sendProgress >= 1) return;
    if (target === 0 && sendProgress <= 0) return;

    const from = sendProgress;
    const duration = target === 1 ? SEND_ENTER_MS : SEND_EXIT_MS;
    const startTime = performance.now();
    setSendDirection(target === 1 ? "enter" : "exit");
    setIsTransitioningSend(true);

    if (sendRafRef.current) {
      cancelAnimationFrame(sendRafRef.current);
    }

    const step = (now) => {
      const elapsed = now - startTime;
      const rawT = Math.min(1, elapsed / duration);
      const nextProgress = from + (target - from) * rawT;
      setSendProgress(nextProgress);

      if (rawT < 1) {
        sendRafRef.current = requestAnimationFrame(step);
      } else {
        setSendProgress(target);
        setIsTransitioningSend(false);
        setSendDirection("idle");
        sendRafRef.current = null;
      }
    };

    sendRafRef.current = requestAnimationFrame(step);
  };

  const handleClickSend = () => {
    if (
      isTransitioningSend ||
      isTransitioningDatasheet ||
      datasheetProgress > 0.01 ||
      sendProgress > 0.01 ||
      isSendModalOpen
    ) {
      return;
    }
    const isEmpty = segmentMatrix.every((digit) =>
      digit.every((seg) => seg === 0)
    );
    if (isEmpty) {
      setIsSendModalOpen(true);
      return;
    }

    // 透過 Socket.IO 將 8x7 陣列數值傳送給 server（event 名稱：client_msg）
    lastSelfSentRef.current = {
      payload: JSON.stringify(segmentMatrix),
      time: Date.now(),
    };
    if (socketRef.current) {
      if (!socketRef.current.connected) {
        socketRef.current.connect();
      }
      socketRef.current.emit("client_msg", segmentMatrix);
    }

    runSendTransition(1);
  };

  const handleCloseSendModal = () => {
    if (isTransitioningSend) return;
    setIsSendModalOpen(false);
    if (sendProgress > 0.01) {
      runSendTransition(0);
    }
  };

  useEffect(() => {
    const updateDeviceType = () => {
      setIsMobileDevice(checkIsMobilePhone());
    };
    updateDeviceType();
    window.addEventListener("resize", updateDeviceType);
    return () => {
      window.removeEventListener("resize", updateDeviceType);
    };
  }, []);

  useEffect(() => {
    if (isMobileDevice !== true) return undefined;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const handleClientMsg = (data) => {
      const normalized = normalizeSegmentMatrix(data);
      if (!normalized) return;

      const serialized = JSON.stringify(normalized);
      const lastSelf = lastSelfSentRef.current;
      if (
        lastSelf &&
        lastSelf.payload === serialized &&
        Date.now() - lastSelf.time < 2500
      ) {
        lastSelfSentRef.current = null;
        return;
      }

      setIncomingMessage((prev) => ({
        matrix: normalized,
        seq: prev.seq + 1,
      }));
    };

    socket.on("client_msg", handleClientMsg);

    return () => {
      socket.off("client_msg", handleClientMsg);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isMobileDevice]);

  useEffect(() => {
    return () => {
      if (datasheetRafRef.current) {
        cancelAnimationFrame(datasheetRafRef.current);
      }
      if (sendRafRef.current) {
        cancelAnimationFrame(sendRafRef.current);
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

  // 由 Send 時間軸 (2.85s 正向 / 1.15s 反向) 衍生的 UI 退場、七段顯示器居中、加速閃爍與直接展開為通知卡參數
  const isSendActive = sendProgress > 0.01;
  const sendSec = sendProgress * 2.85;
  const sendHudOpacity = 1 - smoothStep(0.5, 1.4, sendSec);
  const sendMoveT =
    sendDirection === "exit"
      ? smoothStep(0.25, 1.8, sendSec)
      : smoothStep(0.5, 1.5, sendSec);
  const sendPointerOpacity = 1 - smoothStep(0.5, 0.9, sendSec);
  const sendExpandT =
    sendDirection === "exit"
      ? smoothStep(2.05, 2.85, sendSec)
      : smoothStep(2.5, 2.85, sendSec);
  const canCloseSend = !isTransitioningSend && sendProgress >= 0.99;
  let sendBlinkOpacity = 1;
  if (sendDirection === "enter" && sendSec >= 1.5 && sendSec < 2.5) {
    const u = Math.min(1, Math.max(0, (sendSec - 1.5) / 1.0));
    const phase = 2 * Math.PI * (2 * u + 8 * u * u);
    sendBlinkOpacity = Math.cos(phase) >= 0 ? 1 : 0.14;
  }

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

  if (isMobileDevice === null) {
    return (
      <>
        <Head>
          <title>900MHz</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#000000" />
        </Head>
        <main className="relative w-screen h-screen overflow-hidden bg-black" />
      </>
    );
  }

  if (!isMobileDevice) {
    return (
      <>
        <Head>
          <title>900MHz</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#000000" />
        </Head>
        <main className="relative w-screen h-screen overflow-hidden bg-black">
          <MobileOnlyNotice />
        </main>
      </>
    );
  }

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
            pointerEvents: isDatasheetActive || isSendActive ? "none" : "auto",
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
          sendProgress={sendProgress}
          sendDirection={sendDirection}
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
          hudOpacity={sendHudOpacity}
          hullOpacity={Math.min(hudOpacity, sendHudOpacity)}
          labelText={datasheetProgress >= 0.5 ? "DOC // 900.0" : "PROJ // 900.0"}
          mode="both"
        />

        {/* 主畫面「點擊播報器」提示標示（左斜上拉出細線＋標籤，點擊模型時與投影框同步 fadeout） */}
        <ClickModelHint
          frameData={projectionFrameData}
          visible={!isFocused}
          isFadingOut={isFrameFadingOut}
          isDarkMode={isDarkMode}
          hudOpacity={Math.min(hudOpacity, sendHudOpacity)}
          disabled={
            isTransitioningDatasheet ||
            isDatasheetActive ||
            isTransitioningSend ||
            isSendActive
          }
          onClickModel={() => {
            if (
              !isTransitioningDatasheet &&
              !isDatasheetActive &&
              !isTransitioningSend &&
              !isSendActive
            ) {
              focusViewRef.current?.();
            }
          }}
        />

        {/* 畫面左上角日 / 夜間模式切換按鈕 */}
        <ThemeToggleButton
          isDarkMode={isDarkMode}
          hudOpacity={sendHudOpacity}
          disabled={isTransitioningDatasheet || isTransitioningSend || isSendActive}
          onToggle={() => setIsDarkMode((prev) => !prev)}
        />

        {/* 畫面上方作品標題 */}
        <HeaderTitle isDarkMode={isDarkMode} hudOpacity={sendHudOpacity} />

        {/* 主畫面上方八個 2D 小七段顯示器對話框（傳送階段二移至螢幕正中央，階段三執行由慢而快閃爍，閃爍後直接展開為傳送通知卡） */}
        <MainSevenSegmentBubble
          segmentMatrix={segmentMatrix}
          frameData={morphedFrameData}
          visible={!isFocused}
          isFadingOut={isFrameFadingOut}
          isDarkMode={isDarkMode || sendProgress > 0.2}
          hudOpacity={1}
          sendMoveT={sendMoveT}
          sendPointerOpacity={sendPointerOpacity}
          sendBlinkOpacity={sendBlinkOpacity}
          sendExpandT={sendExpandT}
          canCloseSend={canCloseSend}
          onCloseSend={() => {
            if (!isTransitioningSend && sendProgress > 0.01) {
              runSendTransition(0);
            }
          }}
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

        {/* 主畫面下方接收其他使用者新訊息的對話框（監聽 socket.io client_msg） */}
        <IncomingMessageBubble
          messageMatrix={incomingMessage.matrix}
          messageSeq={incomingMessage.seq}
          frameData={projectionFrameData}
          visible={!isFocused}
          isFadingOut={isFrameFadingOut}
          isDarkMode={isDarkMode}
          hudOpacity={Math.min(hudOpacity, sendHudOpacity)}
          onDismiss={() =>
            setIncomingMessage((prev) => ({ ...prev, matrix: null }))
          }
        />

        {/* 右下角作者 / 資訊按鈕（點擊進入 Datasheet 頁面轉場） */}
        {!isFocused && (
          <AuthorInfoButton
            isDarkMode={isDarkMode}
            hudOpacity={Math.min(hudOpacity, sendHudOpacity)}
            disabled={
              isTransitioningDatasheet ||
              isDatasheetActive ||
              isTransitioningSend ||
              isSendActive
            }
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
          isTransitioning={
            isTransitioningDatasheet || isTransitioningSend || isSendActive
          }
          hudOpacity={sendHudOpacity}
          isDarkMode={isDarkMode}
          onBack={() => {
            if (isTransitioningSend || isSendActive) return;
            if (isDatasheetActive) {
              runDatasheetTransition(0);
            } else {
              resetViewRef.current?.();
            }
          }}
          onSend={handleClickSend}
        />

        {/* 傳送內容通知彈窗（未輸入時提示請輸入內容，已輸入時顯示 8x7 小七段亮起狀態與陣列） */}
        <SendResultModal
          visible={isSendModalOpen}
          segmentMatrix={segmentMatrix}
          isDarkMode={isDarkMode}
          onClose={handleCloseSendModal}
        />

        {/* 初始操作說明畫面（確認後上下壓縮收合退場） */}
        <OnboardingGuideModal
          visible={showOnboardingGuide}
          isDarkMode={isDarkMode}
          onClose={() => setShowOnboardingGuide(false)}
        />

        {/* 畫面最下方署名小灰字 */}
        <FooterText
          isDarkMode={isDarkMode || datasheetProgress >= 0.4}
          hudOpacity={sendHudOpacity}
        />
      </main>
    </>
  );
}
