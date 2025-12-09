# Frontend build stage
FROM node:20-alpine AS frontend-builder

# Set working directory
WORKDIR /frontend

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json* ./ 
RUN npm install

# Run Vite build to produce static files
COPY frontend ./
RUN npm run build

# Backend and runtime stage
FROM python:3.8-slim

# Don't write byte code for a cleaner image
ENV PYTHONDONTWRITEBYTECODE=1

# Flush logs immediately
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# Copy backend code & model
COPY model ./model
COPY app ./app
COPY models ./models

# Copy frontend static files
COPY --from=frontend-builder /frontend/dist ./app/frontend/dist

# Say the app uses port 8000
EXPOSE 8000

# Launch the FastAPI app using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
