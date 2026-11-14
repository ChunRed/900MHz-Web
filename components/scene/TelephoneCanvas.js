import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  SEGMENT_COLORS,
  getSegmentInfoByName,
} from "@/components/constants/sevenSegments";

export default function TelephoneCanvas({
  isFocused,
  setIsFocused,
  setActiveSegment,
  setCameraInfo,
  mainLightRef,
  resetViewRef,
}) {
  const mountRef = useRef(null);

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

    // 4. 建立高亮度純白光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xf8fafc, 1);
    hemisphereLight.position.set(0, 15, 0);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.set(8, 12, 10);
    if (mainLightRef) {
      mainLightRef.current = mainLight;
    }
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight.position.set(-8, 4, -8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, -6, -5);
    scene.add(rimLight);

    // 5. 載入 Telephone.glb 並套用材質（本體純白素模、大七段顯示器 0xbbbbbb）
    const clayMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0,
      roughness: 0.9,
      metalness: 0,
    });

    const segmentMeshes = [];
    const segmentMaterials = [];
    const segmentAnimations = new Map();

    const loader = new GLTFLoader();
    let loadedModel = null;

    loader.load(
      "/Telephone.glb?v=2",
      (gltf) => {
        const model = gltf.scene;

        model.traverse((child) => {
          if (child.isMesh) {
            const segInfo =
              getSegmentInfoByName(child.name) ||
              getSegmentInfoByName(child.parent?.name);

            if (segInfo) {
              const segMat = new THREE.MeshStandardMaterial({
                color: SEGMENT_COLORS.base,
                roughness: 0.45,
                metalness: 0.1,
              });
              segmentMaterials.push(segMat);
              child.material = segMat;
              child.userData.segmentInfo = segInfo;
              child.userData.initialY = child.position.y;
              segmentMeshes.push(child);
            } else {
              child.material = clayMaterial;
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

        loadedModel = model;
        scene.add(model);
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

    // 7. 相機滑順運鏡動畫邏輯
    let tweenState = null;
    let isModelFocused = false;

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

    // 點擊模型運鏡至聚焦視角，並鎖定相機移動（直到點擊 Back 按鈕才恢復）
    const focusOnModel = () => {
      if (isModelFocused) return;

      const targetRadius = initialDistance / 2.7;
      const targetTheta = 0; // Azimuth 0°
      const targetPhi = THREE.MathUtils.degToRad(40); // Polar 40° (Euler -50° / 0° / 0°)
      const focusedTarget = new THREE.Vector3(0.95, 0, -1.2);

      isModelFocused = true;
      setIsFocused(true);
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
        }
      );
    };

    // 點擊 Back 按鈕：滑順運鏡恢復至初始角度與縮放比，並重新開啟相機轉動功能
    const resetCameraView = () => {
      isModelFocused = false;
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

    if (resetViewRef) {
      resetViewRef.current = resetCameraView;
    }

    // 8. 射線檢測：大七段顯示器按鈕點擊與模型點擊聚焦
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let hoveredSegment = null;

    const triggerSegmentPress = (segMesh) => {
      const info = segMesh.userData.segmentInfo;
      if (!info) return;
      setActiveSegment(info);
      segmentAnimations.set(segMesh, {
        startTime: performance.now(),
        duration: 240,
      });
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
          if (hoveredSegment && !segmentAnimations.has(hoveredSegment)) {
            hoveredSegment.material.color.setHex(SEGMENT_COLORS.base);
          }
          hoveredSegment = hitMesh;
          if (!segmentAnimations.has(hoveredSegment)) {
            hoveredSegment.material.color.setHex(SEGMENT_COLORS.hover);
          }
          renderer.domElement.style.cursor = "pointer";
        }
      } else if (hoveredSegment) {
        if (!segmentAnimations.has(hoveredSegment)) {
          hoveredSegment.material.color.setHex(SEGMENT_COLORS.base);
        }
        hoveredSegment = null;
        renderer.domElement.style.cursor = "";
      }
    };

    const handlePointerUp = (e) => {
      if (!loadedModel || tweenState) return;

      // 若滑鼠移動超過 5px 視為拖曳，不觸發點擊
      const moveDist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (moveDist > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      // 優先檢測是否點擊到大七段顯示器的任一段
      const segHits = raycaster.intersectObjects(segmentMeshes, false);
      if (segHits.length > 0) {
        triggerSegmentPress(segHits[0].object);
        if (!isModelFocused) {
          focusOnModel();
        }
        return;
      }

      // 若尚未聚焦且點擊到電話本體其他部位，觸發運鏡聚焦並鎖定相機
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

      // 大七段顯示器按鈕下壓回彈動畫
      if (segmentAnimations.size > 0) {
        const now = performance.now();
        segmentAnimations.forEach((anim, mesh) => {
          const t = Math.min((now - anim.startTime) / anim.duration, 1);
          const pressOffset = Math.sin(t * Math.PI) * 0.06;
          mesh.position.y = mesh.userData.initialY - pressOffset;
          mesh.material.color.setHex(
            t < 0.5 ? SEGMENT_COLORS.pressed : SEGMENT_COLORS.base
          );

          if (t >= 1) {
            mesh.position.y = mesh.userData.initialY;
            mesh.material.color.setHex(
              hoveredSegment === mesh
                ? SEGMENT_COLORS.hover
                : SEGMENT_COLORS.base
            );
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
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      clayMaterial.dispose();
      segmentMaterials.forEach((mat) => mat.dispose());
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
  }, [mainLightRef, resetViewRef, setActiveSegment, setCameraInfo, setIsFocused]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full ${
        isFocused ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      }`}
    />
  );
}

