import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Eraser, Pen, Highlighter, Undo2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { useCollaborativeWhiteboard } from "@/hooks/useCollaborativeWhiteboard";

interface WhiteboardOverlayProps {
  whiteboard: ReturnType<typeof useCollaborativeWhiteboard>;
}

export default function WhiteboardOverlay({ whiteboard }: WhiteboardOverlayProps) {
  const { state, canvasRef, startStroke, continueStroke, endStroke, clearBoard, undo, setColor, setWidth, setTool, toggle, colors } = whiteboard;
  const containerRef = useRef<HTMLDivElement>(null);

  // Set canvas size on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [canvasRef, state.isActive]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, [canvasRef]);

  if (!state.isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-35"
      ref={containerRef}
      style={{ opacity: state.opacity }}
    >
      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        style={{ touchAction: 'none' }}
        onMouseDown={e => { const p = getPos(e); startStroke(p.x, p.y); }}
        onMouseMove={e => { if (e.buttons) { const p = getPos(e); continueStroke(p.x, p.y); } }}
        onMouseUp={endStroke}
        onMouseLeave={endStroke}
        onTouchStart={e => { e.preventDefault(); const p = getPos(e); startStroke(p.x, p.y); }}
        onTouchMove={e => { e.preventDefault(); const p = getPos(e); continueStroke(p.x, p.y); }}
        onTouchEnd={endStroke}
      />

      {/* Toolbar */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/95 backdrop-blur-md border border-border shadow-lg">
          {/* Tools */}
          <button
            onClick={() => setTool('pen')}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              state.currentTool === 'pen' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('highlighter')}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              state.currentTool === 'highlighter' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              state.currentTool === 'eraser' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Colors */}
          {colors.map(color => (
            <button
              key={color}
              onClick={() => setColor(color)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${
                state.currentColor === color ? 'border-foreground scale-125' : 'border-transparent'
              }`}
              style={{ backgroundColor: color.startsWith('hsl') ? undefined : color }}
            >
              {color.startsWith('hsl') && (
                <span className="block w-full h-full rounded-full bg-primary" />
              )}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Width */}
          <Slider
            value={[state.currentWidth]}
            onValueChange={([v]) => setWidth(v)}
            min={1}
            max={12}
            step={1}
            className="w-16"
          />

          {/* Actions */}
          <button onClick={undo} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary">
            <Undo2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => { clearBoard(); toggle(); }} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary">
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={toggle} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-destructive/20">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
