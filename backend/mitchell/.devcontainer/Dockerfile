# DevContainer for Mitchell Brain Prediction
# Based on Python 3.11 (same as Lambda)

FROM python:3.11-slim

# Install system dependencies (gcc for building packages)
RUN apt-get update && \
    apt-get install -y gcc g++ git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Copy requirements and install dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Install JupyterLab and development tools
RUN pip install --no-cache-dir \
    jupyterlab \
    ipykernel \
    black \
    pytest \
    tqdm \
    psutil

# Create a directory for notebooks
RUN mkdir -p /workspace/notebooks

# Expose JupyterLab port
EXPOSE 8888

# Default command (will be overridden by postStartCommand)
CMD ["bash"]
