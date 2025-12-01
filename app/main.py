import io
import torch
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from PIL import Image
from torchvision import transforms

from model.model import MnistNet

app = FastAPI(title="MNIST Classification Service")

# Create path to the trained PyTorch model
MODELS_DIR = Path("models")
MODEL_PATH = MODELS_DIR / "mnist_net.pt"

# Load model onto GPU if it's available, otherwise the CPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load the trained MNIST model once when the app is initialized
model = MnistNet()
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.to(device)
model.eval()

# Preprocess image using standard MNIST training transformation
transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((28, 28)),
    transforms.ToTensor(),
    transforms.Normalize((0.1307,), (0.3081,)), # Mean and SD over whole MNIST dataset
])

def predict_digit(image: Image.Image):
    # Apply preprocessing and add batch dimension
    image = transform(image).unsqueeze(0).to(device)

    # Disable gradient computation for faster inference
    with torch.no_grad():

        # Run the model and take the most likely class and its probability
        outputs = model(image)
        probs = torch.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probs, 1)

    return int(predicted.item()), float(confidence.item())

@app.get("/", response_class=HTMLResponse)
# Serve a static homepage at first
async def home():
    index_file = Path("app/templates/index.html")
    return FileResponse(index_file)

@app.post("/predict")
# Receive an uploaded file and run the prediction
async def predict(file: UploadFile = File(...)):
    if file.content_type not in ["image/png", "image/jpeg", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid image type")

    contents = await file.read()
    try:
        # Convert raw bytes into a greyscale image
        image = Image.open(io.BytesIO(contents)).convert("L")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image")

    digit, confidence = predict_digit(image)
    return JSONResponse({"digit": digit, "confidence": confidence})
