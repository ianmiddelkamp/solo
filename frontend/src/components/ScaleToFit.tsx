import { useEffect, useRef, useState } from 'react';

interface Props {
  /** The content's natural, unscaled design width in pixels — e.g. the width this was actually
   * laid out for (matches the PDF it mirrors). Never scaled above 1 (never bigger than this on
   * a wide viewport), only shrunk down to fit when the container is narrower. */
  width: number;
  children: React.ReactNode;
}

/**
 * Renders children at a fixed natural width, then uniformly scales the whole thing down (via
 * CSS transform, never reflow) to fit whatever width is actually available — so nothing loses
 * its aspect ratio or relative proportions, unlike responsive breakpoints reflowing individual
 * pieces differently. Used for the estimate/invoice "document preview," which is deliberately
 * meant to mirror the real PDF layout exactly, just smaller on a narrow screen instead of
 * scrolled or redesigned.
 */
export default function ScaleToFit({ width, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateScale = () => setScale(Math.min(1, container.offsetWidth / width));
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [width]);

  // transform: scale() doesn't change the element's box size for layout purposes, so without
  // this the container would be left with a tall gap of empty space below the visually-shrunk
  // content. Measure the content's real (unscaled) height and size the container to the
  // post-scale height instead.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(([entry]) => setContentHeight(entry.contentRect.height));
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ height: contentHeight * scale || undefined }}>
      <div
        ref={contentRef}
        style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  );
}
