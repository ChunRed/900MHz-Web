/**
 * 900MHz ESP32 8x7-Segment Animation Engine
 *
 * Designed with pure mathematical formulas & a 2D physical coordinate LUT
 * so every effect can be ported 1-to-1 to ESP32 Arduino C++.
 *
 * Segment index order (standard A..G):
 *   0: A (top)
 *   1: B (top-right)
 *   2: C (bottom-right)
 *   3: D (bottom)
 *   4: E (bottom-left)
 *   5: F (top-left)
 *   6: G (middle)
 */

(function (global) {
  const NUM_DIGITS = 8;
  const NUM_SEGS = 7;

  // Physical 2D geometry (each digit is 1.0 wide x 2.0 tall; pitch between digits = 1.35)
  const DIGIT_WIDTH = 1.0;
  const DIGIT_HEIGHT = 2.0;
  const DIGIT_PITCH = 1.35;
  const CANVAS_WIDTH = (NUM_DIGITS - 1) * DIGIT_PITCH + DIGIT_WIDTH; // 10.45
  const CANVAS_HEIGHT = DIGIT_HEIGHT;                                 // 2.00

  // Relative 2D center coordinates (rx, ry) of segments A..G inside one 1.0 x 2.0 digit
  // C++ equivalent:
  //   const float SEG_REL_X[7] = { 0.5f, 1.0f, 1.0f, 0.5f, 0.0f, 0.0f, 0.5f };
  //   const float SEG_REL_Y[7] = { 0.0f, 0.5f, 1.5f, 2.0f, 1.5f, 0.5f, 1.0f };
  const SEG_REL_X = [0.5, 1.0, 1.0, 0.5, 0.0, 0.0, 0.5];
  const SEG_REL_Y = [0.0, 0.5, 1.5, 2.0, 1.5, 0.5, 1.0];

  // Precomputed global 2D physical coordinate lookup table: SEG_POS[digit][seg] = { x, y }
  const SEG_POS = Array.from({ length: NUM_DIGITS }, (_, d) =>
    Array.from({ length: NUM_SEGS }, (_, s) => ({
      x: d * DIGIT_PITCH + SEG_REL_X[s],
      y: SEG_REL_Y[s]
    }))
  );

  // Outer perimeter ring indices derived by excluding center segment G (r < 0.1 from (0.5, 1.0))
  // Ordered clockwise: A(0) -> B(1) -> C(2) -> D(3) -> E(4) -> F(5)
  const PERIMETER_RING = [0, 1, 2, 3, 4, 5];

  function createEmptyMatrix() {
    return Array.from({ length: NUM_DIGITS }, () => Array(NUM_SEGS).fill(0));
  }

  /**
   * Closed 2D rectangular centerline track for MODE 1 snake orbit:
   *   Top edge:    (X_LEFT, Y_TOP) -> (X_RIGHT, Y_TOP)
   *   Right edge:  (X_RIGHT, Y_TOP) -> (X_RIGHT, Y_BOT)
   *   Bottom edge: (X_RIGHT, Y_BOT) -> (X_LEFT, Y_BOT)
   *   Left edge:   (X_LEFT, Y_BOT) -> (X_LEFT, Y_TOP)
   */
  const TRACK_X_LEFT = 0.5;                                       // Center of D1
  const TRACK_X_RIGHT = (NUM_DIGITS - 1) * DIGIT_PITCH + 0.5;     // Center of D8 (9.95)
  const TRACK_Y_TOP = 0.5;                                        // Center of upper squares
  const TRACK_Y_BOT = 1.5;                                        // Center of lower squares
  const TRACK_DX = TRACK_X_RIGHT - TRACK_X_LEFT;                  // 9.45
  const TRACK_DY = TRACK_Y_BOT - TRACK_Y_TOP;                     // 1.00
  const TRACK_PERIM = 2 * TRACK_DX + 2 * TRACK_DY;                // 20.90

  function sampleTrackPoint(dist) {
    const p = ((dist % TRACK_PERIM) + TRACK_PERIM) % TRACK_PERIM;
    if (p < TRACK_DX) {
      return { x: TRACK_X_LEFT + p, y: TRACK_Y_TOP, dir: 'RIGHT →' };
    }
    if (p < TRACK_DX + TRACK_DY) {
      return { x: TRACK_X_RIGHT, y: TRACK_Y_TOP + (p - TRACK_DX), dir: 'TURN ↓' };
    }
    if (p < 2 * TRACK_DX + TRACK_DY) {
      return { x: TRACK_X_RIGHT - (p - TRACK_DX - TRACK_DY), y: TRACK_Y_BOT, dir: 'LEFT ←' };
    }
    return { x: TRACK_X_LEFT, y: TRACK_Y_BOT - (p - 2 * TRACK_DX - TRACK_DY), dir: 'TURN ↑' };
  }

  /**
   * MODE 1: 2D Canvas Snake-Turn Orbiting Block
   * Treats all 8 seven-segment displays as one continuous 2D canvas.
   * A ribbon/snake body of length SNAKE_LEN bends 90 deg around each corner
   * along the closed perimeter track. Every segment within HALF_THICK (Chebyshev)
   * of any spine node lights up.
   */
  function evalMode1(elapsedMs) {
    const CYCLE_MS = 3400;
    const SNAKE_LEN = 4.6;   // Body length along the 2D perimeter (~3.5-4 digits)
    const HALF_THICK = 0.58; // Square brush half-size (covers full upper/lower 1x1 cell)
    const SAMPLES = 18;      // Spine sample count (spacing ~0.27 < HALF_THICK)

    const headDist = ((elapsedMs % CYCLE_MS) / CYCLE_MS) * TRACK_PERIM;
    const spine = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const s = headDist - (i / SAMPLES) * SNAKE_LEN;
      spine.push(sampleTrackPoint(s));
    }

    const headPt = spine[0];
    const matrix = createEmptyMatrix();

    for (let d = 0; d < NUM_DIGITS; d++) {
      for (let s = 0; s < NUM_SEGS; s++) {
        const pos = SEG_POS[d][s];
        let hit = 0;
        for (let i = 0; i <= SAMPLES; i++) {
          const pt = spine[i];
          if (Math.abs(pos.x - pt.x) <= HALF_THICK && Math.abs(pos.y - pt.y) <= HALF_THICK) {
            hit = 1;
            break;
          }
        }
        matrix[d][s] = hit;
      }
    }

    return {
      matrix,
      telemetry: `HEAD(${headPt.x.toFixed(2)}, ${headPt.y.toFixed(2)}) · ${headPt.dir}`,
      overlaySnake: {
        points: spine,
        halfThick: HALF_THICK
      }
    };
  }

  /**
   * MODE 2: 8 Synchronized Perimeter Loops (Middle G Always OFF)
   * Every digit illuminates its outer perimeter segments (A->B->C->D->E->F)
   * sequentially in unison, excluding center segment G (radius from (0.5, 1.0) < 0.1).
   */
  function evalMode2(elapsedMs) {
    const STEP_MS = 100;
    const RING_LEN = PERIMETER_RING.length; // 6
    const TRAIL_LEN = 1;                    // Change to 2 for a 2-segment line tail
    const head = Math.floor(elapsedMs / STEP_MS) % RING_LEN;

    const SEG_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
    const matrix = createEmptyMatrix();

    for (let d = 0; d < NUM_DIGITS; d++) {
      for (let s = 0; s < NUM_SEGS; s++) {
        // 2D radial distance check from digit center (0.5, 1.0): excludes G (r = 0)
        const dx = SEG_REL_X[s] - 0.5;
        const dy = SEG_REL_Y[s] - 1.0;
        const radius = Math.hypot(dx, dy);
        if (radius < 0.1) {
          matrix[d][s] = 0;
          continue;
        }

        const ringIdx = PERIMETER_RING.indexOf(s);
        const dist = (head - ringIdx + RING_LEN) % RING_LEN;
        matrix[d][s] = dist < TRAIL_LEN ? 1 : 0;
      }
    }

    return {
      matrix,
      telemetry: `RING STEP ${head + 1}/6 · SEG ${SEG_LABELS[head]} · G=OFF`,
      overlaySnake: null
    };
  }

  /**
   * MODE 3: Overlapping Alternating Up-Down Squares Flip (3x Cycles)
   * No dark pause between flips: while the current pass is still lighting up
   * the back digits, the front digits already begin flipping into the next
   * inverted pass (staggered wave overlap controlled by PASS_STRIDE < NUM_DIGITS).
   *
   * Per-digit formula at global step t:
   *   latestPass = min(TOTAL_PASSES - 1, floor((t - d) / PASS_STRIDE))
   *   targetY    = ((d + latestPass) % 2 == 0) ? 0.5 : 1.5
   *   segOn      = |SEG_REL_Y[s] - targetY| <= 0.55
   */
  function evalMode3(elapsedMs) {
    const STEP_MS = 125;
    const TOTAL_PASSES = 6; // 3 full A->B cycles
    const PASS_STRIDE = 5;  // Next inverted wave launches at D1 while current wave is at D6 (3-digit overlap)
    const FINAL_STEP = (TOTAL_PASSES - 1) * PASS_STRIDE + (NUM_DIGITS - 1); // 32
    const END_HOLD_STEPS = 4; // Brief hold after the 3rd repetition completes before restarting preview
    const TOTAL_STEPS = FINAL_STEP + 1 + END_HOLD_STEPS; // 37

    const step = Math.floor(elapsedMs / STEP_MS) % TOTAL_STEPS;
    const matrix = createEmptyMatrix();

    for (let d = 0; d < NUM_DIGITS; d++) {
      if (step < d) {
        // Initial wave (Pass 0) has not reached digit d yet
        continue;
      }

      const latestPass = Math.min(TOTAL_PASSES - 1, Math.floor((step - d) / PASS_STRIDE));
      const isUpper = ((d + latestPass) % 2) === 0;
      const targetY = isUpper ? 0.5 : 1.5;

      for (let s = 0; s < NUM_SEGS; s++) {
        matrix[d][s] = Math.abs(SEG_REL_Y[s] - targetY) <= 0.55 ? 1 : 0;
      }
    }

    const frontPass = Math.min(TOTAL_PASSES - 1, Math.floor(step / PASS_STRIDE));
    const cycleNum = Math.floor(frontPass / 2) + 1;
    const polarity = frontPass % 2 === 0 ? 'A (上下)' : 'B (下上)';
    const statusText = step > FINAL_STEP
      ? `CYCLE 3/3 HOLD · LOOP`
      : `CYCLE ${cycleNum}/3 · WAVE ${polarity} · STEP ${step + 1}/${FINAL_STEP + 1}`;

    return {
      matrix,
      telemetry: statusText,
      overlaySnake: null
    };
  }

  const ANIMATION_MODES = [
    {
      id: 1,
      code: 'MODE 01',
      name: '畫布貪吃蛇繞圈',
      subtitle: '2D Canvas Snake-Turn Orbit',
      formulaNote: 'spine[i] = track(head - i*ds); hit = max(|dx|,|dy|) <= 0.58',
      description: '將 8 顆七段顯示器視為單一 2D 物理畫布，方塊沿周界如貪吃蛇般於轉角 90° 彎折循環繞圈。',
      evaluate: evalMode1
    },
    {
      id: 2,
      code: 'MODE 02',
      name: '八顆外框同步繞圈',
      subtitle: '8x Perimeter Ring Loop',
      formulaNote: 'r(dx,dy) >= 0.1 && (head - ringIdx + 6) % 6 < 1',
      description: '排除所有顯示器中間段 G，其餘外框段落 A→B→C→D→E→F 同步依序繞圈如八條循環光線。',
      evaluate: evalMode2
    },
    {
      id: 3,
      code: 'MODE 03',
      name: '上下方塊交錯重疊翻轉 ×3',
      subtitle: 'Overlapping Alternating Flip (3x)',
      formulaNote: 'pass = floor((t - d) / 5); targetY = ((d + pass) % 2) ? 1.5 : 0.5',
      description: '無全滅停頓：前半部在前一波尚未結束時即開始顛倒翻轉，形成連續重疊交錯波浪重複三次。',
      evaluate: evalMode3
    }
  ];

  global.ESP32Animations = {
    NUM_DIGITS,
    NUM_SEGS,
    DIGIT_PITCH,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    SEG_REL_X,
    SEG_REL_Y,
    SEG_POS,
    MODES: ANIMATION_MODES,
    getModeById(id) {
      return ANIMATION_MODES.find((m) => m.id === id) || ANIMATION_MODES[0];
    }
  };
})(window);
