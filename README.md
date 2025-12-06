# MNIST classifier using Docker

A full-stack, containerized React web application that classifies user-drawn digits using a simple neural network trained on the MNIST dataset.

This project is an example of end-to-end machine learning deployment: a FastAPI inference service, a React + TS frontend, a reproducible Dockerized environment integrated with GitHub Actions for continuous integration and delivery, as well as deployment with AWS ECR + Lambda for public access.

<p align="center"> <img src="screenshot.png" width="500"> </p>

## Features & Components

- MNIST digit classifier trained with PyTorch

- Containerized API using FastAPI + Uvicorn

- Interactive web UI where users draw digits in the browser, built with React, TypeScript, CSS and Vite

- Additional features including expanded classification results, prediction history and UI darkmode

- Fully Dockerized for reproducible builds and cross-platform execution, with multiple Docker stages

- CI/CD Pipeline with GitHub Actions to build and publish Docker images

    - Includes testing with PyTest

- Deployment using AWS ECR + Lambda for public access

- Clean, simple architecture suitable for learning ML deployment concepts

## Running locally

`docker build -t jamwardy/mnist-service .`

`docker run -p 8000:8000 jamwardy/mnist-service`

then in your browser go to:

`http://localhost:8000`