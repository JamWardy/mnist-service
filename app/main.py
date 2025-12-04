import io
from pathlib import Path
from typing import Tuple

import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from torchvision import transforms

from model.model import MnistNet

app = FastAPI(title="MNIST Classification Service")

# CORS (allow all origins in dev – tighten in prod if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:5173"] for Vite dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR.parent / "models"
MODEL_PATH = MODELS_DIR / "mnist_net.pt"

# Load model once at startup
device = torch.device("cpu")
model = MnistNet()
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.eval()

transform = transforms.Compose(
    [
        transforms.Resize((28, 28)),
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,)),  # standard MNIST stats
    ]
)

def predict_digit(image: Image.Image) -> Tuple[int, float]:
    img = transform(image).unsqueeze(0)  # shape (1, 1, 28, 28)
    with torch.no_grad():
        output = model(img)
        probabilities = torch.softmax(output, dim=1)
        confidence, predicted = torch.max(probabilities, dim=1)
    return int(predicted.item()), float(confidence.item())

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in {"image/png", "image/jpeg", "image/jpg"}:
        raise HTTPException(status_code=400, detail="Invalid image type")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("L")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image")

    digit, confidence = predict_digit(image)
    return JSONResponse({"digit": digit, "confidence": confidence})

# --- React static files (production) ---

FRONTEND_DIR = BASE_DIR / "frontend" / "dist"

if FRONTEND_DIR.exists():
    # Vite puts JS/CSS into /assets
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIR / "assets"),
        name="assets",
    )

    @app.get("/", include_in_schema=False)
    async def serve_frontend_root():
        return FileResponse(FRONTEND_DIR / "index.html")
