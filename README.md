# MNIST classifier using Docker

A full-stack, containerized web application that classifies user-drawn digits using a simple neural network trained on the MNIST dataset.

This project is an example of end-to-end machine learning deployment: a FastAPI inference service, a lightweight HTML/JavaScript frontend, and a reproducible Dockerized environment integrated with GitHub Actions for continuous integration and delivery.

<p align="center"> <img src="screenshot.png" width="500"> </p>

## Features & Components

- MNIST digit classifier trained with PyTorch

- Containerized API using FastAPI + Uvicorn

- Interactive web UI where users draw digits in the browser, built with HTML / CSS / JS

- Fully Dockerized for reproducible builds and cross-platform execution

- CI/CD Pipeline with GitHub Actions

    - Testing with PyTest

    - Builds Docker images

    - Lints code

    - Publishes container images

- Clean, simple architecture suitable for learning ML deployment concepts

## Running

`docker build -t jamwardy/mnist-service .`

`docker run -p 8000:8000 jamwardy/mnist-service`

then in your browser go to:

`http://localhost:8000`