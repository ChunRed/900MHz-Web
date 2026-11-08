import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function Home() {
  const mountRef = useRef(null);
  const resetViewRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [cameraInfo, setCameraInfo] = useState({
    azimuth: "0.0",
    polar: "0.0",
    rotX: "0.0",
    rotY: "0.0",
    rotZ: "0.0",
    distance: "0.00",
    zoomPercent: "100",
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. 建立場景，背景設為白色
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // 2. 建立相機
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    const initialPosition = new THREE.Vector3(5, 10, 10);
    camera.position.copy(initialPosition);

    // 3. 建立渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. 建立高亮度純白光源（讓素模接近背景的純白色，僅保留極淺的立體輪廓）
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xf8fafc, 1);
    hemisphereLight.position.set(0, 15, 0);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.set(8, 12, 10);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight.position.set(-8, 4, -8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, -6, -5);
    scene.add(rimLight);

    // 5. 載入 Telephone.glb 並套用高亮度純白素模（白膜）材質，置於世界正中間 (0, 0, 0)
    const clayMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0,
      roughness: 0.9,
      metalness: 0,
    });

    const loader = new GLTFLoader();
    let loadedModel = null;

    loader.load(
      "/Telephone.glb",
      (gltf) => {
        const model = gltf.scene;

        // 將所有 Mesh 替換為素模（白膜）材質
        model.traverse((child) => {
          if (child.isMesh) {
            child.material = clayMaterial;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // 將模型初始 Y 軸旋轉 180 度
        model.rotation.y = Math.PI;
        model.updateMatrixWorld(true);

        // 計算模型邊界盒並將模型幾何中心對齊至世界正中間 (0, 0, 0)
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        loadedModel = model;
        scene.add(model);
      },
      undefined,
      (error) => {
        console.error("載入 Telephone.glb 發生錯誤:", error);
      }
    );

    // 6. 加入 OrbitControls 讓使用者只能旋轉與縮放視角（禁止上下左右平移）
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.update();

    const initialTarget = new THREE.Vector3(0, 0, 0);
    const initialDistance = camera.position.distanceTo(initialTarget);
    const initialSpherical = new THREE.Spherical().setFromVector3(
      initialPosition.clone().sub(initialTarget)
    );

    const normalizeZero = (val, decimals) => {
      const fixed = val.toFixed(decimals);
      return Number(fixed) === 0 ? (0).toFixed(decimals) : fixed;
    };

    const updateCameraStats = () => {
      const azimuthDeg = THREE.MathUtils.radToDeg(controls.getAzimuthalAngle());
      const polarDeg = THREE.MathUtils.radToDeg(controls.getPolarAngle());
      const rotXDeg = THREE.MathUtils.radToDeg(camera.rotation.x);
      const rotYDeg = THREE.MathUtils.radToDeg(camera.rotation.y);
      const rotZDeg = THREE.MathUtils.radToDeg(camera.rotation.z);
      const currentDistance = camera.position.distanceTo(controls.target);
      const zoomPct = (initialDistance / currentDistance) * 100;

      setCameraInfo({
        azimuth: normalizeZero(azimuthDeg, 1),
        polar: normalizeZero(polarDeg, 1),
        rotX: normalizeZero(rotXDeg, 1),
        rotY: normalizeZero(rotYDeg, 1),
        rotZ: normalizeZero(rotZDeg, 1),
        distance: currentDistance.toFixed(2),
        zoomPercent: zoomPct.toFixed(0),
      });
    };

    updateCameraStats();
    controls.addEventListener("change", updateCameraStats);

    // 7. 相機滑順運鏡動畫邏輯 (球座標 + 目標中心點平移補間)
    let tweenState = null;

    const startCameraTransition = (
      targetTheta,
      targetPhi,
      targetRadius,
      targetCenter,
      onComplete
    ) => {
      const currentOffset = camera.position.clone().sub(controls.target);
      const currentSpherical = new THREE.Spherical().setFromVector3(currentOffset);

      // 處理水平角度最短路徑補間
      let deltaTheta = targetTheta - currentSpherical.theta;
      while (deltaTheta > Math.PI) deltaTheta -= Math.PI * 2;
      while (deltaTheta < -Math.PI) deltaTheta += Math.PI * 2;

      controls.enabled = false;
      tweenState = {
        startTime: performance.now(),
        duration: 900, // 0.9 秒滑順運鏡
        startTheta: currentSpherical.theta,
        targetTheta: currentSpherical.theta + deltaTheta,
        startPhi: currentSpherical.phi,
        targetPhi,
        startRadius: currentSpherical.radius,
        targetRadius,
        startTarget: controls.target.clone(),
        targetCenter: targetCenter.clone(),
        onComplete,
      };
    };

    // 點擊模型運鏡至：Azimuth 0°, Polar 0°, Euler -90° / 0° / 0°, 縮放 240%，並向上平移約 0.2
    const focusOnModel = () => {
      const targetRadius = initialDistance / 1.8; // 縮放 240%
      const targetTheta = 0; // Azimuth 0°
      const targetPhi = 1e-6; // Polar 0° (正上方俯視，Euler 為 -90° / 0° / 0°)
      // 俯視視角 (Euler -90/0/0) 下，畫面「上方」對應世界座標 -Z 軸（同時往上微調 Y +0.2）
      const focusedTarget = new THREE.Vector3(0.2, 0, -2);

      setIsFocused(true);
      startCameraTransition(
        targetTheta,
        targetPhi,
        targetRadius,
        focusedTarget,
        () => {
          controls.target.copy(focusedTarget);
          camera.position.set(
            focusedTarget.x,
            focusedTarget.y + targetRadius,
            focusedTarget.z + 1e-6
          );
          camera.lookAt(focusedTarget);
          controls.enabled = true;
          controls.update();
          updateCameraStats();
        }
      );
    };

    // 返回按鈕：滑順運鏡恢復至初始角度、位置與縮放比 (100%)
    const resetCameraView = () => {
      setIsFocused(false);
      startCameraTransition(
        initialSpherical.theta,
        initialSpherical.phi,
        initialSpherical.radius,
        initialTarget,
        () => {
          controls.target.copy(initialTarget);
          camera.position.copy(initialPosition);
          camera.lookAt(initialTarget);
          controls.enabled = true;
          controls.update();
          updateCameraStats();
        }
      );
    };
    resetViewRef.current = resetCameraView;

    // 8. 射線檢測：偵測使用者點擊模型（排除拖曳旋轉）與手動滑動取消 Back 按鈕
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let isPointerDown = false;

    const handlePointerDown = (e) => {
      isPointerDown = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e) => {
      if (!isPointerDown || tweenState) return;
      const moveDist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      // 當使用者滑動超過 5px 調整相機角度時，自動隱藏 Back 按鈕
      if (moveDist > 5) {
        setIsFocused(false);
      }
    };

    const handlePointerUp = (e) => {
      isPointerDown = false;
      if (!loadedModel || tweenState) return;

      // 若滑鼠移動超過 5px 視為旋轉拖曳，不觸發點擊運鏡
      const moveDist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (moveDist > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(loadedModel, true);

      if (intersects.length > 0) {
        focusOnModel();
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("pointerdown", handlePointerDown);
    domElement.addEventListener("pointermove", handlePointerMove);
    domElement.addEventListener("pointerup", handlePointerUp);

    // 9. 視窗縮放自適應
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // 10. 動畫迴圈
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (tweenState) {
        const now = performance.now();
        const elapsed = now - tweenState.startTime;
        const progress = Math.min(elapsed / tweenState.duration, 1);

        // EaseInOutCubic 滑順曲線
        const ease =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const currentTheta = THREE.MathUtils.lerp(
          tweenState.startTheta,
          tweenState.targetTheta,
          ease
        );
        const currentPhi = THREE.MathUtils.lerp(
          tweenState.startPhi,
          tweenState.targetPhi,
          ease
        );
        const currentRadius = THREE.MathUtils.lerp(
          tweenState.startRadius,
          tweenState.targetRadius,
          ease
        );

        const spherical = new THREE.Spherical(
          currentRadius,
          Math.max(1e-6, currentPhi),
          currentTheta
        );
        controls.target.lerpVectors(
          tweenState.startTarget,
          tweenState.targetCenter,
          ease
        );
        camera.position.setFromSpherical(spherical).add(controls.target);
        camera.lookAt(controls.target);
        updateCameraStats();

        if (progress >= 1) {
          const doneCallback = tweenState.onComplete;
          tweenState = null;
          if (doneCallback) doneCallback();
        }
      } else {
        controls.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // 清理資源
    return () => {
      window.removeEventListener("resize", handleResize);
      domElement.removeEventListener("pointerdown", handlePointerDown);
      domElement.removeEventListener("pointermove", handlePointerMove);
      domElement.removeEventListener("pointerup", handlePointerUp);
      controls.removeEventListener("change", updateCameraStats);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      clayMaterial.dispose();
      if (loadedModel) {
        loadedModel.traverse((child) => {
          if (child.isMesh && child.geometry) {
            child.geometry.dispose();
          }
        });
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <>
      <Head>
        <title>900MHz-Web</title>
        <title>900MHz</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="relative w-screen h-screen overflow-hidden bg-white">
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* 畫面上方作品名稱 Title */}
        <header className="pointer-events-none fixed top-8 left-1/2 -translate-x-1/2 z-10 select-none">
          <h1 className="font-sans text-3xl font-extralight tracking-[0.25em] text-zinc-800">
            900MHz
          </h1>
        </header>

        {/* 畫面右上角資訊按鈕與彈出式相機狀態面板 */}
        <div className="fixed top-4 right-4 z-20 flex flex-col items-end gap-2">
          <button
            onClick={() => setShowInfo((prev) => !prev)}
            aria-label="Toggle Camera Info"
            title="相機狀態資訊"
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
            <div className="rounded-lg border border-zinc-200 bg-white/95 px-4 py-3 font-mono text-xs text-zinc-700 shadow-md backdrop-blur-sm space-y-1.5">
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
                <span className="text-zinc-400">
                  (距離: {cameraInfo.distance})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 畫面下方返回按鈕 */}
        {isFocused && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={() => resetViewRef.current && resetViewRef.current()}
              className="cursor-pointer rounded-full border border-zinc-300 bg-white/95 px-6 py-2.5 text-sm font-medium text-zinc-800 shadow-md backdrop-blur-sm transition-all hover:bg-zinc-100 hover:shadow-lg active:scale-95"
            >
              Back
            </button>
          </div>
        )}
      </main>
    </>
  );
}
