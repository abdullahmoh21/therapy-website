# backend/Dockerfile
# — build the frontend first —
FROM node:18-alpine AS frontend-builder
WORKDIR /tmp/frontend

# copy over just the manifest, install, then full copy
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# — now build the backend & pull in the built SPA —
FROM node:18-alpine
WORKDIR /usr/src/app

# install backend deps - clean install
COPY backend/package*.json ./
RUN npm ci && npm cache clean --force

# bring in backend source (excluding node_modules)
COPY backend ./

# swap in the freshly built SPA
RUN rm -rf public \
 && mkdir -p public
COPY --from=frontend-builder /tmp/frontend/dist/ ./public/

# expose & launch
EXPOSE 3200
CMD ["npm", "start"]
