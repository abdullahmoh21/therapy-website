# Build frontend
FROM node:18-slim AS frontend-builder
WORKDIR /tmp/frontend

COPY frontend/package*.json ./
RUN npm install --no-optional
COPY frontend ./
RUN npm run build

# Build backend
FROM node:18-alpine
WORKDIR /usr/src/app

# Install only production deps
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy backend code
COPY backend ./

# Copy frontend build to backend public dir
COPY --from=frontend-builder /tmp/frontend/dist ./public
VOLUME /usr/src/app/public

EXPOSE 3200
CMD ["npm", "start"]
