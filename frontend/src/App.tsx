import React, { useEffect, useRef, useState } from "react";

const CANVAS_SIZE = 280;
const MNIST_SIZE = 28;

// Same-origin by default; override with env if you put the API elsewhere
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

interface PredictResponse {
  digit?: number;
  confidence?: number;
  error?: string;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  // initialize canvas (black background, white stroke)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getCanvasPos = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in event && event.touches[0]) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    } else if ("clientX" in event) {
      return {
        x: (event as React.MouseEvent).clientX - rect.left,
        y: (event as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawingRef.current = true;
    const pos = getCanvasPos(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getCanvasPos(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = (
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    setResult("");
    setError("");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const classify = async () => {
    setResult("");
    setError("");

    const canvas = canvasRef.current;
    if (!canvas) return;

    // downscale to 28x28
    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = MNIST_SIZE;
    smallCanvas.height = MNIST_SIZE;
    const sctx = smallCanvas.getContext("2d");
    if (!sctx) {
      setError("Could not get 2D context.");
      return;
    }
    sctx.drawImage(canvas, 0, 0, MNIST_SIZE, MNIST_SIZE);

    smallCanvas.toBlob(async (blob) => {
      if (!blob) {
        setError("Failed to create image blob.");
        return;
      }

      const formData = new FormData();
      formData.append("file", blob, "digit.png");

      try {
        const response = await fetch(`${API_BASE}/predict`, {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as PredictResponse;

        if (!response.ok || data.error) {
          throw new Error(data.error ?? "Server error");
        }

        const confidencePercent = (data.confidence ?? 0) * 100;
        setResult(
          `Prediction: ${data.digit}   Confidence: ${confidencePercent.toFixed(
            2
          )}%`
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Error: ${message}`);
      }
    }, "image/png");
  };

  return (
    <div className="app-root">
      <h1>Draw a Digit (0 - 9), and the model will classify it!</h1>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
      </div>

      <div>
        <button type="button" onClick={clearCanvas}>
          Clear
        </button>
        <button type="button" onClick={classify}>
          Classify
        </button>
      </div>

      {result && <div className="result">{result}</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default App;
