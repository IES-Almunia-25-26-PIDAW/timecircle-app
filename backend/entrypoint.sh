#!/bin/sh
set -e

echo "Waiting for DB..."
until nc -z "$DB_HOST" "${DB_PORT:-5432}"; do
  sleep 1
done
echo "DB ready."

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Running database migrations..."
python manage.py migrate --no-input

echo "DEBUG mode: $DEBUG"

if [ "$DEBUG" = "True" ] || [ "$DEBUG" = "1" ]; then
  echo "Seeding database with demo data..."
  python manage.py seed_categories
  python manage.py seed_demo_data
fi
echo "Starting ASGI server (channels enabled)..."

gunicorn backend.asgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --worker-class uvicorn.workers.UvicornWorker \
  --timeout 60 \
  --access-logfile - \
  --error-logfile -