FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY service/frontend/package.json service/frontend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY service/frontend/ ./
RUN npm exec tsc -- && npm exec vite build --

FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DB_PATH=/data/ai-trader.db \
    AI_TRADER_API_BACKGROUND_TASKS=false \
    API_STDERR_LOG=true
WORKDIR /app
COPY service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt email-validator
COPY service/server/ ./server/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
COPY deploy/serve_web.py ./server/serve_web.py
RUN useradd --create-home --shell /usr/sbin/nologin app \
    && mkdir -p /data /app/server/logs \
    && chown -R app:app /data /app
USER app
EXPOSE 8000
CMD ["uvicorn", "serve_web:app", "--app-dir", "/app/server", "--host", "0.0.0.0", "--port", "8000"]
