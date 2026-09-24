import type { KeyboardEvent, PointerEvent, RefObject } from 'react';

type Props = {
  /** 'x' resizes left/right panes, 'y' resizes top/bottom panes. */
  axis: 'x' | 'y';
  /** The flex container whose size the percentage is measured against. */
  container: RefObject<HTMLElement | null>;
  value: number;
  min: number;
  max: number;
  onChange: (percent: number) => void;
  label: string;
};

/** A draggable divider between two panes, like LeetCode's panel handles. */
export function Gutter({ axis, container, value, min, max, onChange, label }: Props) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const box = container.current?.getBoundingClientRect();
    if (!box) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add(axis === 'x' ? 'resizing-x' : 'resizing-y');
    const move = (ev: globalThis.PointerEvent) => {
      const percent = axis === 'x' ? ((ev.clientX - box.left) / box.width) * 100 : ((ev.clientY - box.top) / box.height) * 100;
      onChange(clamp(percent));
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      document.body.classList.remove('resizing-x', 'resizing-y');
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const back = axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
    const forward = axis === 'x' ? 'ArrowRight' : 'ArrowDown';
    if (e.key === back || e.key === forward) {
      e.preventDefault();
      onChange(clamp(value + (e.key === forward ? 2 : -2)));
    }
  }

  return (
    <div
      className={`gutter gutter-${axis}`}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}
