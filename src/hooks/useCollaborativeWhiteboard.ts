import { useState, useRef, useCallback, useEffect } from 'react';

export interface WhiteboardStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  tool: 'pen' | 'eraser' | 'highlighter';
}

export interface WhiteboardState {
  strokes: WhiteboardStroke[];
  isActive: boolean;
  currentColor: string;
  currentWidth: number;
  currentTool: 'pen' | 'eraser' | 'highlighter';
  opacity: number;
}

const COLORS = [
  'hsl(var(--primary))',
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ffffff',
  '#000000',
];

export function useCollaborativeWhiteboard() {
  const [state, setState] = useState<WhiteboardState>({
    strokes: [],
    isActive: false,
    currentColor: COLORS[0],
    currentWidth: 3,
    currentTool: 'pen',
    opacity: 0.85,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<WhiteboardStroke | null>(null);

  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isActive: !prev.isActive }));
  }, []);

  const setColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, currentColor: color }));
  }, []);

  const setWidth = useCallback((width: number) => {
    setState(prev => ({ ...prev, currentWidth: width }));
  }, []);

  const setTool = useCallback((tool: 'pen' | 'eraser' | 'highlighter') => {
    setState(prev => ({ ...prev, currentTool: tool }));
  }, []);

  const setOpacity = useCallback((opacity: number) => {
    setState(prev => ({ ...prev, opacity }));
  }, []);

  const startStroke = useCallback((x: number, y: number) => {
    isDrawingRef.current = true;
    currentStrokeRef.current = {
      id: `stroke-${Date.now()}`,
      points: [{ x, y }],
      color: state.currentTool === 'eraser' ? 'rgba(0,0,0,0)' : state.currentColor,
      width: state.currentTool === 'highlighter' ? state.currentWidth * 3 : state.currentWidth,
      tool: state.currentTool,
    };
  }, [state.currentColor, state.currentWidth, state.currentTool]);

  const continueStroke = useCallback((x: number, y: number) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    currentStrokeRef.current.points.push({ x, y });
    renderStrokes([...state.strokes, currentStrokeRef.current]);
  }, [state.strokes]);

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;

    if (currentStrokeRef.current.points.length > 1) {
      setState(prev => ({
        ...prev,
        strokes: [...prev.strokes, currentStrokeRef.current!],
      }));
    }
    currentStrokeRef.current = null;
  }, []);

  const clearBoard = useCallback(() => {
    setState(prev => ({ ...prev, strokes: [] }));
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  const undo = useCallback(() => {
    setState(prev => ({
      ...prev,
      strokes: prev.strokes.slice(0, -1),
    }));
  }, []);

  const renderStrokes = useCallback((strokes: WhiteboardStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.4;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    });
  }, []);

  // Re-render when strokes change
  useEffect(() => {
    renderStrokes(state.strokes);
  }, [state.strokes, renderStrokes]);

  return {
    state,
    canvasRef,
    toggle,
    setColor,
    setWidth,
    setTool,
    setOpacity,
    startStroke,
    continueStroke,
    endStroke,
    clearBoard,
    undo,
    colors: COLORS,
  };
}
