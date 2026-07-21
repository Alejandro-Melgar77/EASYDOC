# ===== SGDIA Backend - Multi-stage Dockerfile =====

# ---------- Stage 1: Builder ----------
FROM python:3.11-slim AS builder

WORKDIR /tmp

COPY requirements.txt .

RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Optional local AI engines are isolated from the stable API dependency cache.
COPY requirements-local-ai.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements-local-ai.txt

# ---------- Stage 2: Runtime ----------
FROM python:3.11-slim AS runtime

# Metadata
LABEL maintainer="SGDIA Team"
LABEL description="SGDIA - Sistema de Gestión Documental con Inteligencia Artificial"

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-spa \
    libmagic1 \
    curl \
    ffmpeg \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder stage
COPY --from=builder /install /usr/local

# Create non-root user
RUN groupadd -r sgdia && useradd -r -g sgdia -d /app -s /sbin/nologin sgdia

# Set working directory
WORKDIR /app

# Copy application code
COPY . .

# Change ownership
RUN chown -R sgdia:sgdia /app

# Switch to non-root user
USER sgdia

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run the application
CMD python scripts/seed_db.py && python scripts/seed_easydoc_demo.py && python scripts/create_vector_indexes.py && uvicorn app.main:app --host 0.0.0.0 --port 8000

