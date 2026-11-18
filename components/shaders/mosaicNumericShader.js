import * as THREE from "three";

export const MOSAIC_DEFAULTS = {
  cellSize: 14.0,
  threshold: 0.72,
  speed: 4.0,
};

/**
 * 在 Client 端使用離屏 HTML5 <canvas> 動態繪製 0~9 黑白等寬數字貼圖集 (10 格水平排列)
 */
export function createDigitAtlasTexture() {
  const cellPx = 128;
  const digitCount = 10;
  const canvas = document.createElement("canvas");
  canvas.width = cellPx * digitCount;
  canvas.height = cellPx;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#000000";
    ctx.font =
      'bold 90px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < digitCount; i += 1) {
      const cx = i * cellPx + cellPx * 0.5;
      const cy = cellPx * 0.53;
      ctx.fillText(String(i), cx, cy);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 自訂 GLSL 後處理著色器：
 * 精細四叉樹多尺度馬賽克 + 避開 3D 七段顯示器之局部邊角遮罩 + 碎化/細分化退場動態 (uDissolve)
 */
export function createMosaicNumericShader(digitTexture, resolution) {
  return {
    uniforms: {
      tDiffuse: { value: null },
      uDigitTex: { value: digitTexture },
      uResolution: {
        value: resolution
          ? resolution.clone()
          : new THREE.Vector2(1280, 800),
      },
      uCellSize: { value: MOSAIC_DEFAULTS.cellSize },
      uThreshold: { value: MOSAIC_DEFAULTS.threshold },
      uSpeed: { value: MOSAIC_DEFAULTS.speed },
      uTime: { value: 0.0 },
      uMaskSeed: { value: 1.0 },
      uDissolve: { value: 0.0 },
      uDatasheetCoverage: { value: 0.0 },
      uDatasheetCoarsen: { value: 0.0 },
      uSceneBrightness: { value: 1.0 },
      uDisplayExclude: { value: new THREE.Vector4(-1, -1, -1, -1) },
      uMaskCenters: {
        value: [
          new THREE.Vector2(420, 260),
          new THREE.Vector2(760, 520),
          new THREE.Vector2(440, 560),
        ],
      },
      uMaskRadii: { value: [65.0, 60.0, 55.0] },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform sampler2D uDigitTex;
      uniform vec2 uResolution;
      uniform float uCellSize;
      uniform float uThreshold;
      uniform float uSpeed;
      uniform float uTime;
      uniform float uMaskSeed;
      uniform float uDissolve;
      uniform float uDatasheetCoverage;
      uniform float uDatasheetCoarsen;
      uniform float uSceneBrightness;
      uniform vec4 uDisplayExclude;
      uniform vec2 uMaskCenters[3];
      uniform float uMaskRadii[3];

      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float sampleLumAtPx(vec2 px) {
        vec2 uv = clamp(px / uResolution, vec2(0.0), vec2(1.0));
        vec3 rgb = texture2D(tDiffuse, uv).rgb;
        vec3 srgb = pow(max(rgb, vec3(0.0)), vec3(1.0 / 2.2));
        return clamp(dot(srgb, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
      }

      void evalCellStats(
        vec2 cellOriginPx,
        float cellSize,
        out float lMin,
        out float lMax,
        out float lCenter
      ) {
        float l0 = sampleLumAtPx(cellOriginPx + vec2(0.18, 0.18) * cellSize);
        float l1 = sampleLumAtPx(cellOriginPx + vec2(0.82, 0.18) * cellSize);
        float l2 = sampleLumAtPx(cellOriginPx + vec2(0.18, 0.82) * cellSize);
        float l3 = sampleLumAtPx(cellOriginPx + vec2(0.82, 0.82) * cellSize);
        lCenter = sampleLumAtPx(cellOriginPx + vec2(0.5, 0.5) * cellSize);
        lMin = min(min(l0, l1), min(l2, l3));
        lMax = max(max(l0, l1), max(l2, l3));
        lMin = min(lMin, lCenter);
        lMax = max(lMax, lCenter);
      }

      void main() {
        vec4 origTexel = texture2D(tDiffuse, vUv);
        vec3 origSrgb = pow(max(origTexel.rgb, vec3(0.0)), vec3(1.0 / 2.2));
        float origLum = clamp(dot(origSrgb, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);

        if (uSceneBrightness <= 0.002) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }

        if (uDissolve >= 0.999) {
          gl_FragColor = vec4(origSrgb * uSceneBrightness, 1.0);
          return;
        }

        vec2 pixelPos = vUv * uResolution;

        // 精細四叉樹多尺度網格分割
        // - uDissolve 增加時逐步強制細分化碎裂
        // - uDatasheetCoarsen 增加時擴大基礎格子並降低細分深度（合併成粗大像素方格）
        float coarseScale = mix(1.0, 2.75, uDatasheetCoarsen);
        float size0 = max(10.0, uCellSize * 1.75 * coarseScale);
        float size1 = size0 * 0.5;
        float size2 = size0 * 0.25;
        float size3 = size0 * 0.125;

        float chosenSize = size0;
        vec2 chosenIndex = floor(pixelPos / size0);
        int chosenLevel = 0;

        float lMin = 0.0;
        float lMax = 0.0;
        float lCenter = 0.0;

        float dissolveSplitBoost = uDissolve * 0.85;
        float coarsenPenalty = uDatasheetCoarsen * 1.45;

        // Level 0
        vec2 idx0 = floor(pixelPos / size0);
        evalCellStats(idx0 * size0, size0, lMin, lMax, lCenter);
        bool straddlesEdge0 = (lMax >= 0.05 && lMin < 0.05);
        bool allowDetailSplit0 = uDatasheetCoarsen < 0.72;
        bool split0 = allowDetailSplit0 && (
          straddlesEdge0 ||
          (lMax - lMin > 0.11 + coarsenPenalty * 0.4) ||
          ((hash21(idx0 + uMaskSeed * 1.13) + dissolveSplitBoost - coarsenPenalty) > 0.28)
        );

        if (split0) {
          vec2 idx1 = floor(pixelPos / size1);
          evalCellStats(idx1 * size1, size1, lMin, lMax, lCenter);
          bool straddlesEdge1 = (lMax >= 0.05 && lMin < 0.05);
          bool allowDetailSplit1 = uDatasheetCoarsen < 0.48;
          bool split1 = allowDetailSplit1 && (
            straddlesEdge1 ||
            (lMax - lMin > 0.16 + coarsenPenalty * 0.45) ||
            ((hash21(idx1 + uMaskSeed * 1.71) + dissolveSplitBoost - coarsenPenalty) > 0.42)
          );

          if (split1) {
            vec2 idx2 = floor(pixelPos / size2);
            evalCellStats(idx2 * size2, size2, lMin, lMax, lCenter);
            bool straddlesEdge2 = (lMax >= 0.05 && lMin < 0.05);
            bool allowDetailSplit2 = uDatasheetCoarsen < 0.25;
            bool split2 = allowDetailSplit2 && (
              straddlesEdge2 ||
              (lMax - lMin > 0.24 + coarsenPenalty * 0.5) ||
              ((hash21(idx2 + uMaskSeed * 2.37) + dissolveSplitBoost * 1.15 - coarsenPenalty) > 0.62)
            );

            if (split2) {
              vec2 idx3 = floor(pixelPos / size3);
              evalCellStats(idx3 * size3, size3, lMin, lMax, lCenter);
              chosenSize = size3;
              chosenIndex = idx3;
              chosenLevel = 3;
            } else {
              chosenSize = size2;
              chosenIndex = idx2;
              chosenLevel = 2;
            }
          } else {
            chosenSize = size1;
            chosenIndex = idx1;
            chosenLevel = 1;
          }
        }

        // 以目前方塊中心轉回 Top-Down 螢幕像素座標判定遮罩 (Datasheet 轉場時逐步擴張至 100% 全螢幕覆蓋)
        vec2 cellCenterPx = (chosenIndex + 0.5) * chosenSize;
        vec2 cellScreenPos = vec2(cellCenterPx.x, uResolution.y - cellCenterPx.y);

        bool inDisplaySafeZone =
          (uDatasheetCoverage < 0.08) &&
          uDisplayExclude.z > uDisplayExclude.x &&
          cellScreenPos.x >= uDisplayExclude.x &&
          cellScreenPos.x <= uDisplayExclude.z &&
          cellScreenPos.y >= uDisplayExclude.y &&
          cellScreenPos.y <= uDisplayExclude.w;

        if (inDisplaySafeZone) {
          gl_FragColor = vec4(origSrgb * uSceneBrightness, 1.0);
          return;
        }

        float maxDiag = length(uResolution);
        float r0 = mix(max(uMaskRadii[0], 1.0), maxDiag * 1.15, uDatasheetCoverage);
        float r1 = mix(max(uMaskRadii[1], 1.0), maxDiag * 1.15, uDatasheetCoverage);
        float r2 = mix(max(uMaskRadii[2], 1.0), maxDiag * 1.15, uDatasheetCoverage);

        float d0 = length(cellScreenPos - uMaskCenters[0]) / r0;
        float d1 = length(cellScreenPos - uMaskCenters[1]) / r1;
        float d2 = length(cellScreenPos - uMaskCenters[2]) / r2;
        float minDist = min(d0, min(d1, d2));

        vec2 maskCell = floor(cellScreenPos / max(size2, 4.0));
        float maskJitter = (hash21(maskCell + uMaskSeed * 3.17) - 0.5) * 0.36 * (1.0 - uDatasheetCoverage);
        float screenEdgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        bool inScreenBorder = screenEdgeDist < (0.14 + maskJitter * 0.08);
        bool inEdgeMask = (uDatasheetCoverage >= 0.98) || ((minDist + maskJitter) < 1.0) || inScreenBorder;

        if (!inEdgeMask) {
          gl_FragColor = vec4(origSrgb * uSceneBrightness, 1.0);
          return;
        }

        // 碎化溶解判定：隨 uDissolve 由外而內、由細碎方塊逐一消融回原始清晰 3D 模型
        if (uDissolve > 0.001) {
          vec2 shardIdx = floor(pixelPos / max(size2, 3.5));
          float shardHash = hash21(shardIdx + uMaskSeed * 5.41);
          float radialBias = clamp(minDist, 0.0, 1.0) * 0.35;
          if ((shardHash * 0.75 + (1.0 - radialBias) * 0.25) < uDissolve * 1.12) {
            gl_FragColor = vec4(origSrgb, 1.0);
            return;
          }
        }

        // 純黑背景隔離：背景處保持純黑 #000000
        float luminance = lCenter;
        if (luminance < 0.05 && origLum < 0.05) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }
        if (luminance < 0.05) {
          if (lMax < 0.05) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
          luminance = lMax * 0.65;
        }

        // 方塊邊緣細網格線 (大中小方塊間皆保有約 1px 分隔線)
        vec2 cellLocalUv = fract(pixelPos / chosenSize);
        vec2 distToEdgePx = min(cellLocalUv, 1.0 - cellLocalUv) * chosenSize;
        if (distToEdgePx.x < 0.55 || distToEdgePx.y < 0.55) {
          float borderShade = ((luminance < 0.28) ? 0.22 : 0.02) * uSceneBrightness;
          gl_FragColor = vec4(vec3(borderShade), 1.0);
          return;
        }

        float cellHash = hash21(chosenIndex + uMaskSeed * 0.53);
        float tick = floor(uTime * max(0.0, uSpeed) + cellHash * 17.0);
        float tickHash = hash21(chosenIndex + vec2(tick * 0.73, tick * 1.19));

        bool isBrightDigitCell = (luminance > uThreshold) && (chosenLevel <= 2);
        bool isRandomMidDigitCell = (chosenLevel <= 1) && (cellHash > 0.66) && (luminance >= 0.15);

        if (isBrightDigitCell || isRandomMidDigitCell) {
          float normLum = clamp((luminance - 0.15) / 0.85, 0.0, 1.0);
          float digitIndex = mod(
            floor(normLum * 8.99 + (tickHash > 0.5 ? floor(tickHash * 4.0) : 0.0)),
            10.0
          );

          vec2 glyphUv = (cellLocalUv - 0.16) / 0.68;
          float glyphMask = 1.0;
          if (
            glyphUv.x >= 0.0 &&
            glyphUv.x <= 1.0 &&
            glyphUv.y >= 0.0 &&
            glyphUv.y <= 1.0
          ) {
            float atlasU = (digitIndex + clamp(glyphUv.x, 0.02, 0.98)) / 10.0;
            float atlasV = clamp(glyphUv.y, 0.02, 0.98);
            float sampleVal = texture2D(uDigitTex, vec2(atlasU, atlasV)).r;
            glyphMask = smoothstep(0.35, 0.65, sampleVal);
          }

          if (isBrightDigitCell) {
            float brightNorm = clamp(
              (luminance - uThreshold) / max(1.0 - uThreshold, 0.001),
              0.0,
              1.0
            );
            float bgShade = mix(0.88, 1.0, brightNorm);
            gl_FragColor = vec4(vec3(bgShade) * glyphMask * uSceneBrightness, 1.0);
          } else {
            float strokeFactor = 1.0 - glyphMask;
            vec3 cellColor = mix(vec3(luminance * 0.85), vec3(0.92), strokeFactor);
            gl_FragColor = vec4(cellColor * uSceneBrightness, 1.0);
          }
          return;
        }

        gl_FragColor = vec4(vec3(luminance) * uSceneBrightness, 1.0);
      }
    `,
  };
}
