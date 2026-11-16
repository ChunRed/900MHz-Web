import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  BASE_COLOR,
  BIG_DISPLAY_BACKPLATE_COLOR,
  BIG_DISPLAY_BACKPLATE_NAME,
  BIG_SEGMENT_ACTIVE_STYLE,
  CLAY_BODY_COLORS,
  LED_COLOR,
  RING_COLOR,
  SEGMENT_COLORS,
  SEGMENT_DARK_COLORS,
  SMALL_DIGIT_COUNT,
  SMALL_SEGMENT_ACTIVE_STYLE,
  SMALL_SEGMENT_DEFAULT_COLOR,
  getSegmentInfoByName,
  getSmallSegmentInfoByName,
  isBaseMeshName,
  isLedMeshName,
  isRingMeshName,
} from "@/components/constants/sevenSegments";

const applySmallSegmentAppearance = (entry, isLit, smallGlow, isDark) => {
  const { material, haloSprite } = entry;

  if (isLit) {
    material.color.setHex(SMALL_SEGMENT_ACTIVE_STYLE.color);
    material.emissive.setHex(SMALL_SEGMENT_ACTIVE_STYLE.emissive);
    material.emissiveIntensity =
      smallGlow <= 0 ? 0.35 : 0.45 + 1.85 * smallGlow;

    if (haloSprite) {
      const baseOpacity = isDark
        ? SMALL_SEGMENT_ACTIVE_STYLE.haloOpacityDark
        : SMALL_SEGMENT_ACTIVE_STYLE.haloOpacityLight;
      const opacity = baseOpacity * smallGlow;
      haloSprite.visible = opacity > 0.01;
      haloSprite.material.opacity = opacity;
    }
  } else {
    material.color.setHex(SMALL_SEGMENT_DEFAULT_COLOR);
    material.emissive.setHex(0x000000);
    material.emissiveIntensity = 0;
    if (haloSprite) {
      haloSprite.visible = false;
      haloSprite.material.opacity = 0;
    }
  }
};

// 產生柔和暖黃色徑向漸層光暈貼圖，供大小七段顯示器發光光暈使用
const createGlowTexture = () => {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const center = size / 2;
  const gradient = ctx.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center
  );
  gradient.addColorStop(0, "rgba(255, 225, 150, 0.95)");
  gradient.addColorStop(0.28, "rgba(255, 225, 150, 0.52)");
  gradient.addColorStop(0.62, "rgba(255, 225, 150, 0.16)");
  gradient.addColorStop(1, "rgba(255, 225, 150, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

// 計算 2D 點集的凸包 (Monotone Chain 演算法)
const compute2DConvexHull = (points) => {
  if (points.length <= 2) return points;
  const pts = points
    .slice()
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o, a, b) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
};

export default function TelephoneCanvas({
  isFocused,
  isDarkMode,
  activeDigitIndex,
  bigGlowIntensity,
  smallGlowIntensity,
  setIsFocused,
  setIsCameraSettled,
  setIsFrameFadingOut,
  setArrowPositions,
  setDigitPointerPositions,
  setCameraInfo,
  onUpdateProjectionFrame,
  mainLightRef,
  resetViewRef,
}) {
  const mountRef = useRef(null);
  const isDarkModeRef = useRef(isDarkMode);
  const activeDigitIndexRef = useRef(activeDigitIndex);
  const bigGlowRef = useRef(bigGlowIntensity);
  const smallGlowRef = useRef(smallGlowIntensity);
  const onUpdateProjectionFrameRef = useRef(onUpdateProjectionFrame);
  const sceneObjectsRef = useRef(null);
  const smallSegmentStateRef = useRef(
    Array.from({ length: SMALL_DIGIT_COUNT }, () => ({}))
  );

  useEffect(() => {
    onUpdateProjectionFrameRef.current = onUpdateProjectionFrame;
  }, [onUpdateProjectionFrame]);

  useEffect(() => {
    activeDigitIndexRef.current = activeDigitIndex;
    const objs = sceneObjectsRef.current;
    if (objs?.syncBigSegmentsWithDigit) {
      objs.syncBigSegmentsWithDigit(activeDigitIndex);
    }
  }, [activeDigitIndex]);

  useEffect(() => {
    bigGlowRef.current = bigGlowIntensity;
    const objs = sceneObjectsRef.current;
    if (objs?.syncBigSegmentsWithDigit) {
      objs.syncBigSegmentsWithDigit(activeDigitIndexRef.current);
    }
  }, [bigGlowIntensity]);

  useEffect(() => {
    smallGlowRef.current = smallGlowIntensity;
    const objs = sceneObjectsRef.current;
    if (!objs) return;

    objs.smallSegmentEntries.forEach((entry) => {
      const isLit = Boolean(
        smallSegmentStateRef.current[entry.digitIndex]?.[entry.segId]
      );
      applySmallSegmentAppearance(
        entry,
        isLit,
        smallGlowIntensity,
        isDarkModeRef.current
      );
    });
  }, [smallGlowIntensity]);

  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
    const objs = sceneObjectsRef.current;
    if (!objs) return;

    const clayBaseColor = isDarkMode
      ? CLAY_BODY_COLORS.dark
      : CLAY_BODY_COLORS.light;

    // 切換純黑 / 純白背景，並微調燈光與材質明暗，讓夜間模式富有光影層次、不死白也不死黑
    objs.scene.background.setHex(isDarkMode ? 0x000000 : 0xffffff);
    objs.clayMaterial.color.setHex(clayBaseColor);
    objs.ambientLight.intensity = isDarkMode ? 0.15 : 0.2;
    objs.hemisphereLight.intensity = isDarkMode ? 0.55 : 1.0;
    objs.hemisphereLight.groundColor.setHex(isDarkMode ? 0x27272a : 0xf8fafc);
    objs.mainLight.intensity = isDarkMode ? 1.45 : 2.0;
    objs.fillLight.intensity = isDarkMode ? 0.55 : 1.0;
    objs.rimLight.intensity = isDarkMode ? 0.5 : 0.8;

    // 同步更新大七段顯示器狀態（已點亮維持 #ffe196 與光暈，未點亮依日/夜間模式切換灰階）
    if (objs.syncBigSegmentsWithDigit) {
      objs.syncBigSegmentsWithDigit(activeDigitIndexRef.current);
    }

    // 同步維持小七段顯示器樣式（未點亮 0x888888，點亮暖黃光發光效果）
    objs.smallSegmentEntries.forEach((entry) => {
      const isLit = Boolean(
        smallSegmentStateRef.current[entry.digitIndex]?.[entry.segId]
      );
      applySmallSegmentAppearance(entry, isLit, smallGlowRef.current, isDarkMode);
    });
  }, [isDarkMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const getPalette = () =>
      isDarkModeRef.current ? SEGMENT_DARK_COLORS : SEGMENT_COLORS;

    const getClayBaseColor = () =>
      isDarkModeRef.current ? CLAY_BODY_COLORS.dark : CLAY_BODY_COLORS.light;

    // 1. 建立場景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(
      isDarkModeRef.current ? 0x000000 : 0xffffff
    );

    // 2. 建立相機
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    const BASE_REFERENCE_DISTANCE = 15.0; // 基準距離（對應 100% 縮放）
    // 初始縮放幅度改為 77%（距離約 19.48）
    const initialPosition = new THREE.Vector3(5, 10, 10).multiplyScalar(
      1 / 0.77
    );
    camera.position.copy(initialPosition);

    // 3. 建立渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. 建立光源
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      isDarkModeRef.current ? 0.15 : 0.2
    );
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(
      0xffffff,
      isDarkModeRef.current ? 0x27272a : 0xf8fafc,
      isDarkModeRef.current ? 0.55 : 1.0
    );
    hemisphereLight.position.set(0, 15, 0);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight(
      0xffffff,
      isDarkModeRef.current ? 1.45 : 2.0
    );
    mainLight.position.set(8, 12, 10);
    if (mainLightRef) {
      mainLightRef.current = mainLight;
    }
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(
      0xffffff,
      isDarkModeRef.current ? 0.55 : 1.0
    );
    fillLight.position.set(-8, 4, -8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(
      0xffffff,
      isDarkModeRef.current ? 0.5 : 0.8
    );
    rimLight.position.set(0, -6, -5);
    scene.add(rimLight);

    // 5. 載入 Telephone.glb 並套用材質（本體素模、大七段底板、大七段顯示器與 56 個小七段顯示器獨立材質）
    const clayMaterial = new THREE.MeshStandardMaterial({
      color: getClayBaseColor(),
      emissive: 0xffffff,
      emissiveIntensity: 0,
      roughness: 0.9,
      metalness: 0,
    });

    const backplateMaterial = new THREE.MeshStandardMaterial({
      color: BIG_DISPLAY_BACKPLATE_COLOR,
      roughness: 0.75,
      metalness: 0.05,
    });

    const ledMaterial = new THREE.MeshStandardMaterial({
      color: LED_COLOR,
      roughness: 0.5,
      metalness: 0.05,
    });

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: RING_COLOR,
      roughness: 0.6,
      metalness: 0.05,
    });

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: BASE_COLOR,
      roughness: 0.8,
      metalness: 0.05,
    });

    const glowTexture = createGlowTexture();
    const segmentMeshes = [];
    const segmentMaterials = [];
    const bigSegmentEntries = [];
    const segmentAnimations = new Map();
    let hoveredSegment = null;

    // smallSegmentMap[digitIndex][segId] -> entry ({ mesh, material, haloSprite })
    const smallSegmentMap = Array.from(
      { length: SMALL_DIGIT_COUNT },
      () => ({})
    );
    const smallSegmentEntries = [];

    const isBigSegmentLit = (
      segMesh,
      digitIndex = activeDigitIndexRef.current
    ) => {
      const segInfo = segMesh?.userData?.segmentInfo;
      if (!segInfo) return false;
      return Boolean(
        smallSegmentStateRef.current[digitIndex]?.[segInfo.smallSegId]
      );
    };

    const applyBigSegmentAppearance = (entry, isLit, isHovered = false) => {
      const { mesh, material, pointLight, haloSprite } = entry;
      const palette = getPalette();
      const bigGlow = bigGlowRef.current;

      if (isLit) {
        const hoverBoost = isHovered ? 0.25 : 0;
        material.color.setHex(BIG_SEGMENT_ACTIVE_STYLE.color);
        material.emissive.setHex(BIG_SEGMENT_ACTIVE_STYLE.emissive);
        material.emissiveIntensity =
          (bigGlow <= 0 ? 0.45 : 0.65 + 1.85 * bigGlow) + hoverBoost;

        const baseLightIntensity = isDarkModeRef.current
          ? BIG_SEGMENT_ACTIVE_STYLE.pointLightIntensityDark
          : BIG_SEGMENT_ACTIVE_STYLE.pointLightIntensityLight;
        pointLight.intensity = baseLightIntensity * bigGlow;

        const baseHaloOpacity = isDarkModeRef.current
          ? BIG_SEGMENT_ACTIVE_STYLE.haloOpacityDark
          : BIG_SEGMENT_ACTIVE_STYLE.haloOpacityLight;
        const opacity = baseHaloOpacity * bigGlow;
        haloSprite.visible = opacity > 0.01;
        haloSprite.material.opacity = opacity;
      } else {
        material.color.setHex(
          hoveredSegment === mesh || isHovered ? palette.hover : palette.base
        );
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
        pointLight.intensity = 0;
        haloSprite.visible = false;
        haloSprite.material.opacity = 0;
      }
    };

    const syncBigSegmentsWithDigit = (digitIndex) => {
      bigSegmentEntries.forEach((entry) => {
        const isLit = isBigSegmentLit(entry.mesh, digitIndex);
        applyBigSegmentAppearance(
          entry,
          isLit,
          hoveredSegment === entry.mesh
        );
      });
    };

    sceneObjectsRef.current = {
      scene,
      clayMaterial,
      ambientLight,
      hemisphereLight,
      mainLight,
      fillLight,
      rimLight,
      segmentMaterials,
      smallSegmentEntries,
      syncBigSegmentsWithDigit,
    };

    let modelSamplePoints = [];
    const lastCameraMatrix = new THREE.Matrix4();
    const projVec = new THREE.Vector3();
    let isModelFocused = false;
    let isFadingOutFrame = false;
    let focusTimeout = null;

    // 即時計算相機視角看向模型的外輪廓投影（包含 2D 投影包圍框與 Convex Hull 多邊形）
    const computeProjectionFrame = () => {
      if (
        isModelFocused ||
        isFadingOutFrame ||
        tweenState ||
        !onUpdateProjectionFrameRef.current ||
        modelSamplePoints.length === 0 ||
        !container
      ) {
        return;
      }

      camera.updateMatrixWorld();
      if (lastCameraMatrix.equals(camera.matrixWorldInverse)) {
        return;
      }
      lastCameraMatrix.copy(camera.matrixWorldInverse);

      const width = container.clientWidth;
      const height = container.clientHeight;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      const screenPoints = [];

      for (let i = 0; i < modelSamplePoints.length; i++) {
        projVec.copy(modelSamplePoints[i]).project(camera);
        if (projVec.z > 1) continue;

        const sx = ((projVec.x + 1) / 2) * width;
        const sy = ((-projVec.y + 1) / 2) * height;

        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;

        screenPoints.push({ x: sx, y: sy });
      }

      if (screenPoints.length === 0 || minX === Infinity) return;

      const padding = 12;
      const box = {
        x: Math.round(minX - padding),
        y: Math.round(minY - padding),
        width: Math.round(maxX - minX + padding * 2),
        height: Math.round(maxY - minY + padding * 2),
      };

      const hull = compute2DConvexHull(screenPoints);

      onUpdateProjectionFrameRef.current({ box, hull });
    };

    const loader = new GLTFLoader();
    let loadedModel = null;

    loader.load(
      "/Telephone.glb?v=3",
      (gltf) => {
        const model = gltf.scene;
        const currentPalette = getPalette();

        model.traverse((child) => {
          if (child.isMesh) {
            const segInfo =
              getSegmentInfoByName(child.name) ||
              getSegmentInfoByName(child.parent?.name);

            if (segInfo) {
              const segMat = new THREE.MeshStandardMaterial({
                color: currentPalette.base,
                emissive: 0x000000,
                emissiveIntensity: 0,
                roughness: 0.45,
                metalness: 0.1,
              });
              segmentMaterials.push(segMat);
              child.material = segMat;
              child.userData.segmentInfo = segInfo;
              child.userData.initialY = child.position.y;
              segmentMeshes.push(child);
            } else {
              const smallInfo =
                getSmallSegmentInfoByName(child.name) ||
                getSmallSegmentInfoByName(child.parent?.name);

              if (smallInfo) {
                const { segId, digitIndex } = smallInfo;
                const smallMat = new THREE.MeshStandardMaterial({
                  color: SMALL_SEGMENT_DEFAULT_COLOR,
                  roughness: 0.65,
                  metalness: 0.05,
                });
                child.material = smallMat;
                child.userData.smallInfo = { digitIndex, segId };
              } else {
                const normalizedName = child.name.replace(/\./g, "");
                const normalizedParentName = child.parent?.name?.replace(/\./g, "");
                const isBackplate =
                  normalizedName === BIG_DISPLAY_BACKPLATE_NAME ||
                  normalizedParentName === BIG_DISPLAY_BACKPLATE_NAME;
                const isBase =
                  isBaseMeshName(child.name) ||
                  isBaseMeshName(child.parent?.name);
                const isLed =
                  isLedMeshName(child.name) ||
                  isLedMeshName(child.parent?.name);
                const isRing =
                  isRingMeshName(child.name) ||
                  isRingMeshName(child.parent?.name);

                if (isBackplate) {
                  child.material = backplateMaterial;
                } else if (isBase) {
                  child.material = baseMaterial;
                } else if (isLed) {
                  child.material = ledMaterial;
                } else if (isRing) {
                  child.material = ringMaterial;
                } else {
                  child.material = clayMaterial;
                }
              }
            }
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
        model.updateMatrixWorld(true);

        loadedModel = model;
        scene.add(model);

        // 採集整個模型所有子網格在世界坐標系下的包圍盒頂點，用於即時計算外輪廓投影
        const samplePoints = [];
        model.traverse((child) => {
          if (child.isMesh && child.geometry) {
            child.updateMatrixWorld(true);
            if (!child.geometry.boundingBox) {
              child.geometry.computeBoundingBox();
            }
            const b = child.geometry.boundingBox;
            if (b) {
              const localCorners = [
                new THREE.Vector3(b.min.x, b.min.y, b.min.z),
                new THREE.Vector3(b.max.x, b.min.y, b.min.z),
                new THREE.Vector3(b.min.x, b.max.y, b.min.z),
                new THREE.Vector3(b.max.x, b.max.y, b.min.z),
                new THREE.Vector3(b.min.x, b.min.y, b.max.z),
                new THREE.Vector3(b.max.x, b.min.y, b.max.z),
                new THREE.Vector3(b.min.x, b.max.y, b.max.z),
                new THREE.Vector3(b.max.x, b.max.y, b.max.z),
              ];
              localCorners.forEach((c) => {
                c.applyMatrix4(child.matrixWorld);
                samplePoints.push(c);
              });
            }
          }
        });
        modelSamplePoints = samplePoints;
        computeProjectionFrame();

        // 為小七段顯示器各段建立光暈 Sprite 並套用初始樣式
        model.traverse((child) => {
          if (child.isMesh && child.userData.smallInfo) {
            const { digitIndex, segId } = child.userData.smallInfo;
            const segBox = new THREE.Box3().setFromObject(child);
            const segCenter = segBox.getCenter(new THREE.Vector3());

            const haloMat = new THREE.SpriteMaterial({
              map: glowTexture,
              color: 0xffe196,
              blending: THREE.AdditiveBlending,
              transparent: true,
              opacity: 0,
              depthWrite: false,
              depthTest: false,
            });
            const haloSprite = new THREE.Sprite(haloMat);
            haloSprite.position.set(
              segCenter.x,
              segCenter.y + 0.04,
              segCenter.z
            );
            haloSprite.scale.set(0.32, 0.32, 1);
            haloSprite.visible = false;
            scene.add(haloSprite);

            const entry = {
              mesh: child,
              digitIndex,
              segId,
              material: child.material,
              haloSprite,
            };
            const isLit = Boolean(
              smallSegmentStateRef.current[digitIndex]?.[segId]
            );
            applySmallSegmentAppearance(
              entry,
              isLit,
              smallGlowRef.current,
              isDarkModeRef.current
            );

            smallSegmentMap[digitIndex][segId] = entry;
            smallSegmentEntries.push(entry);
          }
        });

        // 在每個大七段顯示器世界座標上方配置專屬點光源與暖黃光暈 Sprite
        segmentMeshes.forEach((segMesh) => {
          const segBox = new THREE.Box3().setFromObject(segMesh);
          const segCenter = segBox.getCenter(new THREE.Vector3());

          const pointLight = new THREE.PointLight(0xffe196, 0, 2.8, 1.5);
          pointLight.position.set(segCenter.x, segCenter.y + 0.28, segCenter.z);
          scene.add(pointLight);

          const haloMat = new THREE.SpriteMaterial({
            map: glowTexture,
            color: 0xffe196,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
          });
          const haloSprite = new THREE.Sprite(haloMat);
          haloSprite.position.set(segCenter.x, segCenter.y + 0.14, segCenter.z);
          haloSprite.scale.set(2.2, 2.2, 1);
          haloSprite.visible = false;
          scene.add(haloSprite);

          const entry = {
            mesh: segMesh,
            material: segMesh.material,
            pointLight,
            haloSprite,
          };
          segMesh.userData.bigEntry = entry;
          bigSegmentEntries.push(entry);
        });

        syncBigSegmentsWithDigit(activeDigitIndexRef.current);
      },
      undefined,
      (error) => {
        console.error("載入 Telephone.glb 發生錯誤:", error);
      }
    );

    // 6. 加入 OrbitControls（預設可旋轉與縮放，禁止平移）
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
      const zoomPct = (BASE_REFERENCE_DISTANCE / currentDistance) * 100;

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

    // 7. 相機滑順運鏡動畫邏輯
    let tweenState = null;

    const startCameraTransition = (
      targetTheta,
      targetPhi,
      targetRadius,
      targetCenter,
      onComplete
    ) => {
      const currentOffset = camera.position.clone().sub(controls.target);
      const currentSpherical = new THREE.Spherical().setFromVector3(
        currentOffset
      );

      let deltaTheta = targetTheta - currentSpherical.theta;
      while (deltaTheta > Math.PI) deltaTheta -= Math.PI * 2;
      while (deltaTheta < -Math.PI) deltaTheta += Math.PI * 2;

      controls.enabled = false;
      tweenState = {
        startTime: performance.now(),
        duration: 900,
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

    // 計算大七段左右按鈕座標與 8 個小七段顯示器上方指示箭頭座標
    const updateScreenOverlayPositions = () => {
      if (!container || segmentMeshes.length === 0) return;

      camera.updateMatrixWorld();
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (setArrowPositions) {
        const segBox = new THREE.Box3();
        segmentMeshes.forEach((m) => segBox.expandByObject(m));

        const center = segBox.getCenter(new THREE.Vector3());
        const leftWorld = new THREE.Vector3(
          segBox.min.x - 0.32,
          center.y,
          center.z
        );
        const rightWorld = new THREE.Vector3(
          segBox.max.x + 0.32,
          center.y,
          center.z
        );

        leftWorld.project(camera);
        rightWorld.project(camera);

        const edgePadding = 26;
        const leftX = Math.max(
          edgePadding,
          Math.min(width - edgePadding, ((leftWorld.x + 1) / 2) * width)
        );
        const leftY = ((-leftWorld.y + 1) / 2) * height;

        const rightX = Math.max(
          edgePadding,
          Math.min(width - edgePadding, ((rightWorld.x + 1) / 2) * width)
        );
        const rightY = ((-rightWorld.y + 1) / 2) * height;

        setArrowPositions({
          left: { x: Math.round(leftX), y: Math.round(leftY) },
          right: { x: Math.round(rightX), y: Math.round(rightY) },
        });
      }

      if (setDigitPointerPositions) {
        const pointerPositions = smallSegmentMap.map((digitEntries) => {
          const entries = Object.values(digitEntries);
          if (entries.length === 0) return null;

          const digitBox = new THREE.Box3();
          entries.forEach(({ mesh }) => digitBox.expandByObject(mesh));
          const digitCenter = digitBox.getCenter(new THREE.Vector3());

          // 定位在該小七段顯示器上緣正上方
          const topWorld = new THREE.Vector3(
            digitCenter.x,
            digitBox.max.y + 0.04,
            digitBox.min.z - 0.09
          );
          topWorld.project(camera);

          return {
            x: Math.round(((topWorld.x + 1) / 2) * width),
            y: Math.round(((-topWorld.y + 1) / 2) * height),
          };
        });
        setDigitPointerPositions(pointerPositions);
      }
    };

    // 點擊模型運鏡至聚焦視角，並鎖定相機移動（直到點擊 Back 按鈕才恢復）
    const focusOnModel = () => {
      if (isModelFocused || isFadingOutFrame || tweenState) return;

      isFadingOutFrame = true;
      if (setIsFrameFadingOut) setIsFrameFadingOut(true);

      // 先讓投影框 fadeout 消失、關閉後才開運鏡，保持運鏡時完全流暢無延遲
      clearTimeout(focusTimeout);
      focusTimeout = setTimeout(() => {
        if (!container) return;
        isModelFocused = true;
        setIsFocused(true);
        if (setIsCameraSettled) setIsCameraSettled(false);

        const targetRadius = BASE_REFERENCE_DISTANCE / 2.7;
        const targetTheta = 0; // Azimuth 0°
        const targetPhi = THREE.MathUtils.degToRad(40); // Polar 40° (Euler -50° / 0° / 0°)
        const focusedTarget = new THREE.Vector3(0.95, 0, -1.2);

        startCameraTransition(
          targetTheta,
          targetPhi,
          targetRadius,
          focusedTarget,
          () => {
            controls.target.copy(focusedTarget);
            const finalSpherical = new THREE.Spherical(
              targetRadius,
              targetPhi,
              targetTheta
            );
            camera.position.setFromSpherical(finalSpherical).add(focusedTarget);
            camera.lookAt(focusedTarget);
            // 保持 controls.enabled = false，鎖定相機不讓使用者轉動或縮放
            controls.enabled = false;
            updateCameraStats();
            // 相機到達定點後，計算左右箭頭與聯動小七段指示箭頭的螢幕座標
            updateScreenOverlayPositions();
            if (setIsCameraSettled) setIsCameraSettled(true);
            isFadingOutFrame = false;
          }
        );
      }, 260);
    };

    // 點擊 Back 按鈕：滑順運鏡恢復至初始角度與縮放比，並重新開啟相機轉動功能
    const resetCameraView = () => {
      clearTimeout(focusTimeout);
      isModelFocused = false;
      setIsFocused(false);
      if (setIsCameraSettled) setIsCameraSettled(false);
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

          // 運鏡回到初始位置後，重新計算外輪廓並讓投影框淡入顯現
          if (setIsFrameFadingOut) setIsFrameFadingOut(false);
          lastCameraMatrix.elements[0] += 0.0001;
          computeProjectionFrame();
        }
      );
    };

    if (resetViewRef) {
      resetViewRef.current = resetCameraView;
    }

    // 8. 射線檢測：大七段顯示器按鈕點擊、小七段與大七段聯動發光與模型點擊聚焦
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const triggerSegmentPress = (segMesh) => {
      const info = segMesh.userData.segmentInfo;
      if (!info) return;

      // 大七段下壓回彈動畫
      segmentAnimations.set(segMesh, {
        startTime: performance.now(),
        duration: 240,
      });

      // 聯動切換目前所選小七段顯示器與大七段顯示器對應段位之暖黃光效果
      const digitIndex = activeDigitIndexRef.current;
      const smallSegId = info.smallSegId;
      const targetEntry = smallSegmentMap[digitIndex]?.[smallSegId];

      const nextActive = !smallSegmentStateRef.current[digitIndex][smallSegId];
      smallSegmentStateRef.current[digitIndex][smallSegId] = nextActive;

      if (targetEntry) {
        applySmallSegmentAppearance(
          targetEntry,
          nextActive,
          smallGlowRef.current,
          isDarkModeRef.current
        );
      }

      if (segMesh.userData.bigEntry) {
        applyBigSegmentAppearance(
          segMesh.userData.bigEntry,
          nextActive,
          hoveredSegment === segMesh
        );
      }
    };

    const handlePointerDown = (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e) => {
      if (!loadedModel || tweenState) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const segHits = raycaster.intersectObjects(segmentMeshes, false);

      if (segHits.length > 0) {
        const hitMesh = segHits[0].object;
        if (hoveredSegment !== hitMesh) {
          const prevMesh = hoveredSegment;
          hoveredSegment = hitMesh;
          if (prevMesh?.userData?.bigEntry && !segmentAnimations.has(prevMesh)) {
            applyBigSegmentAppearance(
              prevMesh.userData.bigEntry,
              isBigSegmentLit(prevMesh),
              false
            );
          }
          if (hitMesh.userData.bigEntry && !segmentAnimations.has(hitMesh)) {
            applyBigSegmentAppearance(
              hitMesh.userData.bigEntry,
              isBigSegmentLit(hitMesh),
              true
            );
          }
          renderer.domElement.style.cursor = "pointer";
        }
      } else if (hoveredSegment) {
        const prevMesh = hoveredSegment;
        hoveredSegment = null;
        if (prevMesh.userData.bigEntry && !segmentAnimations.has(prevMesh)) {
          applyBigSegmentAppearance(
            prevMesh.userData.bigEntry,
            isBigSegmentLit(prevMesh),
            false
          );
        }
        renderer.domElement.style.cursor = "";
      }
    };

    const handlePointerUp = (e) => {
      if (!loadedModel || tweenState) return;

      const moveDist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (moveDist > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const segHits = raycaster.intersectObjects(segmentMeshes, false);
      if (segHits.length > 0) {
        if (!isModelFocused) {
          focusOnModel();
        } else {
          triggerSegmentPress(segHits[0].object);
        }
        return;
      }

      if (!isModelFocused) {
        const intersects = raycaster.intersectObject(loadedModel, true);
        if (intersects.length > 0) {
          focusOnModel();
        }
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
      if (isModelFocused && !tweenState) {
        updateScreenOverlayPositions();
      }
      lastCameraMatrix.elements[0] += 0.0001;
      computeProjectionFrame();
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
      } else if (controls.enabled) {
        controls.update();
      }

      // 即時計算並更新相機視角看向模型的外輪廓投影框
      if (modelSamplePoints.length > 0) {
        computeProjectionFrame();
      }

      // 大七段顯示器按鈕下壓回彈動畫
      if (segmentAnimations.size > 0) {
        const now = performance.now();
        segmentAnimations.forEach((anim, mesh) => {
          const t = Math.min((now - anim.startTime) / anim.duration, 1);
          const pressOffset = Math.sin(t * Math.PI) * 0.06;
          mesh.position.y = mesh.userData.initialY - pressOffset;

          if (t >= 1) {
            mesh.position.y = mesh.userData.initialY;
            if (mesh.userData.bigEntry) {
              applyBigSegmentAppearance(
                mesh.userData.bigEntry,
                isBigSegmentLit(mesh),
                hoveredSegment === mesh
              );
            }
            segmentAnimations.delete(mesh);
          }
        });
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
      clearTimeout(focusTimeout);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      clayMaterial.dispose();
      backplateMaterial.dispose();
      glowTexture.dispose();
      segmentMaterials.forEach((mat) => mat.dispose());
      bigSegmentEntries.forEach(({ pointLight, haloSprite }) => {
        scene.remove(pointLight);
        scene.remove(haloSprite);
        haloSprite.material.dispose();
      });
      smallSegmentEntries.forEach(({ material, haloSprite }) => {
        material.dispose();
        if (haloSprite) {
          scene.remove(haloSprite);
          haloSprite.material.dispose();
        }
      });
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
      sceneObjectsRef.current = null;
    };
  }, [
    mainLightRef,
    resetViewRef,
    setArrowPositions,
    setCameraInfo,
    setDigitPointerPositions,
    setIsCameraSettled,
    setIsFocused,
    setIsFrameFadingOut,
  ]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full ${
        isFocused ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      }`}
    />
  );
}
