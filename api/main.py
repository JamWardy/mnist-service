# api/main.py
import io
import torch
from pathlib import Path
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
from torchvision import transforms

from model.model import MnistNet

app = FastAPI(title="MNIST Classification Service")

# Load model at startup
MODELS_DIR = Path("models")
MODEL_PATH = MODELS_DIR / "mnist_net.pt"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = MnistNet()
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.to(device)
model.eval()

# Same normalization used in training
transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),  # ensure 1 channel
    transforms.Resize((28, 28)),
    transforms.ToTensor(),
    transforms.Normalize((0.1307,), (0.3081,)),
])


def predict_digit(image: Image.Image):
    image = transform(image).unsqueeze(0).to(device)  # shape: (1, 1, 28, 28)
    with torch.no_grad():
        outputs = model(image)
        probs = torch.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probs, 1)
    return int(predicted.item()), float(confidence.item())


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in ["image/png", "image/jpeg", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid image type")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("L")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image")

    digit, confidence = predict_digit(image)
    return JSONResponse({"digit": digit, "confidence": confidence})
