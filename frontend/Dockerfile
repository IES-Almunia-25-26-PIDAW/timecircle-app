# Build stage
FROM node:24-alpine as builder

WORKDIR /app

ARG VITE_API_URL

COPY package*.json ./

RUN npm install

COPY . .

RUN VITE_API_URL=${VITE_API_URL} npm run build

# Production stage - serve static files
FROM node:24-alpine

WORKDIR /app

# Install a simple HTTP server to serve static files
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
