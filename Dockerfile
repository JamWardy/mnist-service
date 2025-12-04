# --- Frontend build stage ---
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json* ./ 
RUN npm install

COPY frontend ./
RUN npm run build

# --- Backend / runtime stage ---
FROM python:3.8-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code & model
COPY model ./model
COPY app ./app
COPY models ./models

# Copy built frontend into backend package
COPY --from=frontend-builder /frontend/dist ./app/frontend/dist

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
