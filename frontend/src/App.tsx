import React, { useEffect, useRef, useState } from "react";

// Canvas is 280 x 280 pixels for ease of drawing
const CANVAS_SIZE = 280;
const MNIST_SIZE = 28;

// Vite exposes the backend to the frontend
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type PredictResponse = {
  digit: number;
  confidence: number;
  probabilities: number[];
  error?: string;
}

type Theme = "light" | "dark";

type HistoryItem = {
  id: number;
  digit: number;
  confidence: number;
  probabilities: number[];
  createdAt: number;
  imageDataUrl: string;
};

const App: React.FC = () => {
  const [aboutOpen, setAboutOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Are we currently drawing
  const drawingRef = useRef(false);

  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [theme, setTheme] = useState<Theme>("light");

  const [probabilities, setProbabilities] = useState<number[] | null>(null);
  const [predictedDigit, setPredictedDigit] = useState<number | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Set state's theme prop on mount
  useEffect(() => {
    // Avoid errors
    if (typeof window === "undefined") return;

    // Check if browser has specific theme saved
    const stored = window.localStorage.getItem("mnist-service-theme") as Theme | null;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      return;
    }

    // Otherwise use browser's preference
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  // When the theme prop changes, set the document attribute (for CSS)
  useEffect(() => {
    // Avoid errors
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("mnist-service-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // On mount make the canvas black with white drawing (for MNIST)
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

  // Get position of event inside the canvas
  const getCanvasPos = (
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    // Get position of rectangle within the page as offset
    const rect = canvas.getBoundingClientRect();

    let clientX: number;
    let clientY: number;

    // If it's a multi-touch event, get the position of the first touch
    if ("touches" in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      const mouseEvent = event as React.MouseEvent<HTMLCanvasElement>;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    return {
      x: (clientX - rect.left),
      y: (clientY - rect.top),
    };
  };

  const startDrawing = (
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    // Prevent scrolling while drawing
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawingRef.current = true;
    const pos = getCanvasPos(event);

    // Start stroke at the current position
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    // Don't run if drawing hasn't started (ie mouse is moving but hasn't been clicked)
    if (!drawingRef.current) return;
    // Prevent scrolling while drawing
    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getCanvasPos(event);

    // Draw a line to new position in the stroke style
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
    setProbabilities(null);
    setPredictedDigit(null);

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

    // Capture the current drawing as a PNG data URL
    const canvasImageDataUrl = canvas.toDataURL("image/png");    

    // Create hidden 28 x 28 canvas and draw the image on it for classification
    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = MNIST_SIZE;
    smallCanvas.height = MNIST_SIZE;
    const sctx = smallCanvas.getContext("2d");
    if (!sctx) {
      setError("Could not get 2D context.");
      return;
    }
    sctx.drawImage(canvas, 0, 0, MNIST_SIZE, MNIST_SIZE);

    // Convert the small canvas to a png in memory
    smallCanvas.toBlob(async (blob) => {
      if (!blob) {
        setError("Failed to create image blob.");
        return;
      }

      // Create a form with this image under the attribute file
      const formData = new FormData();
      formData.append("file", blob, "digit.png");

      // Send a POST request to the prediction backend and wait for the response
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
          `Prediction: ${data.digit} • Confidence: ${confidencePercent.toFixed(
            2
          )}%`
        );

        if (Array.isArray(data.probabilities) && data.probabilities.length === 10) {
          setProbabilities(data.probabilities);
        } else {
          setProbabilities(null);
        }

        setPredictedDigit(
          typeof data.digit === "number" ? data.digit : null
        );

        if (
          typeof data.digit === "number" &&
          typeof data.confidence === "number" &&
          Array.isArray(data.probabilities) &&
          data.probabilities.length === 10
        ) {
          const newItem: HistoryItem = {
          id: Date.now(),
          digit: data.digit,
          confidence: data.confidence,
          probabilities: data.probabilities,
          createdAt: Date.now(),
          imageDataUrl: canvasImageDataUrl,
        };

          setHistory((prev) => [newItem, ...prev]);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Error: ${message}`);
        setProbabilities(null);
        setPredictedDigit(null);
      }
    }, "image/png");
  };

  const restoreCanvasFromImage = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "black";
      // Fill the canvas black
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      // Draw over the saved image
      ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    };
    img.src = dataUrl;
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setPredictedDigit(item.digit);
    setProbabilities(item.probabilities);
    const pct = item.confidence * 100;
    setResult(
      `Prediction: ${item.digit} • Confidence: ${pct.toFixed(2)}% (from history)`
    );
    setError("");
    restoreCanvasFromImage(item.imageDataUrl);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="page">
      {/* Navbar at the top */}
      <header className="top-nav">
        <div className="top-nav-left">
          <div className="brand-pill">
            <div className="brand-icon">✏️</div>
          </div>
          <span className="brand-name">MyMNIST</span>
          <button
            className="nav-link"
            type="button"
            onClick={() => setAboutOpen(true)}
          >
            About
          </button>
        </div>

        <div className="top-nav-right">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle light / dark mode"
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </header>

      <main className="main">
        {aboutOpen && (
          <div
            className="about-backdrop"
            onClick={() => setAboutOpen(false)}
          >
            <div
              className="about-modal"
              onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
            >
              <div className="about-modal-header">
                <h2>About MyMNIST</h2>
                <button
                  type="button"
                  className="about-close"
                  onClick={() => setAboutOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <p className="about-body">
                MyMNIST is a small demo web app that lets you draw numerical digits (0-9) and classifies them using a neural network trained on the MNIST dataset.
              </p>
              <p className="about-body">
                MNIST is probably the most well-known machine learning dataset. Made in the 90s, the MNIST dataset is a collection of 70,000 handwritten digit images (28×28 pixels) that is widely used as a baseline for image classification systems.
              </p>
              <p className="about-body">
                The confidence scores on the right show how likely the model thinks each digit is, and the history section lets you revisit past predictions.
              </p>
              <p className="about-body">
                Heads up - the model here is very simple, and was not trained for very long, but the best models can achieve an error rate of over 99%!
              </p>
            </div>
          </div>
        )}
        {/* Hero */}
        <section className="hero">
          <h1>Draw &amp; Classify Digits</h1>
          <p>
            Draw any digit from 0 to 9 and our AI-powered classification system will predict what it is!
          </p>
        </section>

        {/* Main content grid */}
      <section className="content-grid">
        {/* LEFT: Canvas + tips */}
        <div className="left-column">
          <div className="card canvas-card">
            <div className="card-header">
              <h2>Drawing Canvas</h2>
              <div className="canvas-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={clearCanvas}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={classify}
                >
                  Classify
                </button>
              </div>
            </div>

            <div className="canvas-shell">
              <div className="canvas-inner">
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
            </div>

            {result && (
              <div className="prediction-banner">
                <span className="prediction-label">Current prediction</span>
                <span className="prediction-value">{result}</span>
              </div>
            )}
            {error && <div className="error-banner">{error}</div>}

            <div className="info-grid">
              <div className="info-card">
                <div className="info-title">
                  <span className="info-icon">💡</span>
                  <span>Tips for better results</span>
                </div>
                <ul>
                  <li>Draw digits clearly and boldly</li>
                  <li>Use the full canvas space</li>
                  <li>Keep digits roughly centered</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Classification Results */}
        <div className="right-column">
          <div className="card results-card">
            <h2 className="results-title">Classification Results</h2>

            {!probabilities && (
              <div className="results-empty">
                <div className="results-empty-icon">👆</div>
                <div>Draw a digit to see predictions</div>
              </div>
            )}

            <div className="scores-section">
              <div className="scores-header">Confidence Scores</div>

              <div className="score-list">
                {Array.from({ length: 10 }).map((_, digit) => {
                  const pct =
                    probabilities && probabilities[digit] != null
                      ? probabilities[digit] * 100
                      : 0;

                  const isActive = predictedDigit === digit;

                  return (
                    <div
                      key={digit}
                      className={`score-row ${
                        isActive ? "score-row-active" : ""
                      }`}
                    >
                      <div className="score-digit">{digit}</div>
                      <div className="score-bar-wrapper">
                        <div className="score-bar-bg">
                          <div
                            className="score-bar-fill"
                            style={{ width: `${pct.toFixed(0)}%` }}
                          />
                        </div>
                      </div>
                      <div className="score-pct">
                        {pct.toFixed(0)}
                        %
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* Classification History */}
        <section className="history-section">
          <div className="card history-card">
            <div className="history-header">
              <h2 className="history-title">Classification History</h2>
              {history.length > 0 && (
                <button
                  type="button"
                  className="history-clear-btn"
                  onClick={clearHistory}
                  aria-label="Clear history"
                >
                  🗑
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="history-empty">
                <div className="history-empty-tile">
                  <div className="history-empty-icon">?</div>
                  <div className="history-empty-text">No history yet</div>
                </div>
              </div>
            ) : (
              <div className="history-list">
                {history.map((item) => {
                  const pct = item.confidence * 100;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="history-item"
                      onClick={() => handleHistoryClick(item)}
                    >
                      <div className="history-item-thumb">
                        <img
                          src={item.imageDataUrl}
                          alt={`Digit ${item.digit}`}
                        />
                        <div className="history-item-thumb-pill">
                          {item.digit}
                        </div>
                      </div>

                      <div className="history-item-main">
                        <div className="history-item-label">
                          Digit {item.digit}
                        </div>
                        <div className="history-item-sub">
                          Confidence {pct.toFixed(0)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
