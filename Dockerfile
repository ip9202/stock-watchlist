# 🐳 Stock Watchlist - Production Docker Configuration
# Supports: Development testing + Railway production deployment

# Stage 1: Python 3.12 base with system packages
FROM python:3.12-slim as python-stage

# Install system dependencies for Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages at system level (no virtual env needed in Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Verify critical packages
RUN python -c "import pykrx; print('✅ PyKRX installed')"
RUN python -c "import yfinance; print('✅ yfinance installed')" 
RUN python -c "import requests; print('✅ requests installed')"
RUN python -c "import pandas; print('✅ pandas installed')"

# Stage 2: Node.js + Python combined
FROM python:3.12-slim as production

# Install Node.js 18 LTS
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from previous stage
COPY --from=python-stage /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=python-stage /usr/local/bin /usr/local/bin

# Set working directory
WORKDIR /app

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Generate Prisma Client only (no migration at build time)
RUN npx prisma generate

# Build Next.js application  
RUN npm run build:docker

# Set environment variables for production
ENV NODE_ENV=production
ENV PYTHONPATH=/app
ENV PYTHON_UNBUFFERED=1

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Copy startup script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Start application with database migration
CMD ["/usr/local/bin/docker-entrypoint.sh"]