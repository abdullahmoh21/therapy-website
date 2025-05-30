# backend.Dockerfile

FROM node:18-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend ./

EXPOSE 3200
CMD ["npm", "start"]
