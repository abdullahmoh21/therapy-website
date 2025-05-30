# frontend.Dockerfile

# Stage 1: Build React frontend
FROM node:18-slim AS builder
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci --omit=dev
COPY frontend ./
RUN npm run build

# Stage 2: Serve with NGINX
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default nginx config with ours
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
