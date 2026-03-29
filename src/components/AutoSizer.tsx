import { useRef, useState, useEffect, type ReactNode } from "react";

interface AutoSizerProps {
  children: (size: { width: number; height: number }) => ReactNode;
  className?: string;
}

export default function AutoSizer({ children, className }: AutoSizerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ flex: 1, minHeight: 0 }}>
      {size.width > 0 && size.height > 0 && children(size)}
    </div>
  );
}
