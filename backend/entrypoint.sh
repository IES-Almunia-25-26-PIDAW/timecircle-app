#!/bin/sh
set -e

echo "Waiting for DB..."
until nc -z "$DB_HOST" "${DB_PORT:-5432}"; do
  sleep 1
done
echo "DB ready."

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "DEBUG mode: $DEBUG"

echo "Running database migrations..."
python manage.py migrate --no-input

echo "Starting ASGI server (channels enabled)..."

gunicorn backend.asgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --worker-class uvicorn.workers.UvicornWorker \
  --timeout 60 \
  --access-logfile - \
  --error-logfile -