export default function SideArrowButtons({
  visible,
  positions,
  isDarkMode,
  onClickLeft,
  onClickRight,
}) {
  if (!visible) return null;

  const leftStyle = positions?.left
    ? { left: `${positions.left.x}px`, top: `${positions.left.y}px` }
    : { left: "28px", top: "52%" };

  const rightStyle = positions?.right
    ? { left: `${positions.right.x}px`, top: `${positions.right.y}px` }
    : { right: "28px", top: "52%" };

  // 外框保持圓形：日間模式為黑底白字；夜間模式為白底黑字；內部僅有純箭頭符號
  const btnClass = `fixed z-20 -translate-x-1/2 -translate-y-1/2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 shadow-md ${
    isDarkMode
      ? "bg-zinc-100 text-zinc-900 hover:bg-white"
      : "bg-zinc-900 text-white hover:bg-black"
  }`;

  return (
    <>
      {/* 左側箭頭按鈕 */}
      <button
        type="button"
        onClick={onClickLeft}
        aria-label="Previous"
        title="左箭頭按鈕"
        style={leftStyle}
        className={btnClass}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {/* 右側箭頭按鈕 */}
      <button
        type="button"
        onClick={onClickRight}
        aria-label="Next"
        title="右箭頭按鈕"
        style={rightStyle}
        className={btnClass}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </>
  );
}
