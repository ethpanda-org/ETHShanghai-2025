# Polymarket Prediction Market Trading System
# Multi-stage Docker build for optimized production deployment

# Stage 1: Base Python environment with system dependencies
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    gcc \
    git \
    libffi-dev \
    libssl-dev \
    pkg-config \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Stage 2: Dependencies installation
FROM base as dependencies

# Create app directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
COPY pyproject.toml .

# Install Python dependencies
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt

# Stage 3: Application build
FROM dependencies as builder

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/data /app/cache

# Set proper permissions
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app

# Stage 4: Production image
FROM python:3.11-slim as production

# Copy installed packages from builder
COPY --from=dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    postgresql-client \
    redis-tools \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app user
RUN useradd --create-home --shell /bin/bash app

# Set working directory
WORKDIR /app

# Copy application code
COPY --from=builder --chown=app:app /app .

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create required directories with proper permissions
RUN mkdir -p /app/logs /app/data /app/cache /app/tmp && \
    chown -R app:app /app

# Switch to app user
USER app

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose ports
# Main API Gateway: 8000
# Web Monitor: 8888
# Microservices: 8001-8005
EXPOSE 8000 8888 8001 8002 8003 8004 8005

# Environment variables
ENV TRADING_ENV=production \
    LOG_LEVEL=INFO \
    PYTHONPATH=/app/src \
    DATA_DIR=/app/data \
    LOG_DIR=/app/logs \
    CACHE_DIR=/app/cache

# Default command - can be overridden
CMD ["python", "src/polymarket/main.py"]

# Development stage
FROM base as development

WORKDIR /app

# Install development dependencies
COPY requirements.txt requirements-dev.txt ./
RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    pip install -r requirements-dev.txt || \
    pip install pytest pytest-asyncio black flake8 mypy

# Copy source code
COPY . .

# Create directories
RUN mkdir -p /app/logs /app/data /app/cache

# Create app user
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app

USER app

# Development environment variables
ENV TRADING_ENV=development \
    LOG_LEVEL=DEBUG \
    PYTHONPATH=/app/src

# Expose ports for development
EXPOSE 8000 8888 8001 8002 8003 8004 8005

CMD ["python", "src/polymarket/main.py"]