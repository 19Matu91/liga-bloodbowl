/**
 * <Th> — cabecera de tabla con tooltip al hover.
 * El tooltip usa un React Portal (renderizado en document.body) para escapar
 * de cualquier overflow:hidden/auto de los contenedores padre.
 */
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  children: React.ReactNode;
  tooltip: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export default function Th({ children, tooltip, className = '', align = 'center' }: Props) {
  const alignCls = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const thRef = useRef<HTMLTableCellElement>(null);

  const handleMouseEnter = () => {
    if (thRef.current) {
      const rect = thRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setVisible(true);
  };

  return (
    <th
      ref={thRef}
      className={`cursor-default ${alignCls} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      <span>{children}</span>

      {visible && createPortal(
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            top: pos.top - 8,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
        >
          <div className="bg-parchment-200 text-white text-xs rounded px-3 py-2 shadow-xl border border-white/10 w-48 text-left leading-snug font-normal whitespace-normal">
            {tooltip}
          </div>
          {/* Arrow pointing down toward the header */}
          <div className="mx-auto w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-parchment-200" />
        </div>,
        document.body
      )}
    </th>
  );
}
