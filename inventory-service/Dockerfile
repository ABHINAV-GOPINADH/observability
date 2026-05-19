FROM node:18-alpine

ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com/
ENV NPM_CONFIG_STRICT_SSL=false
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

WORKDIR /workspace/inventory-service

# Copy package files from service and shared local package
COPY ./inventory-service/package*.json ./
COPY ./shared/observability ../shared/observability

# Install shared observability package dependencies first
RUN cd ../shared/observability && npm install --strict-ssl=false && cd /workspace/inventory-service

# Install all dependencies for build (including devDependencies needed for TypeScript compilation)
RUN npm install --strict-ssl=false

# Copy application code and build
COPY ./inventory-service .
RUN npm run build

# Remove dev dependencies for smaller production image
RUN npm prune --omit=dev

FROM node:18-alpine
WORKDIR /app

COPY --from=0 /workspace/inventory-service/dist ./dist
COPY --from=0 /workspace/inventory-service/node_modules ./node_modules
COPY ./inventory-service/package*.json ./

RUN mkdir -p /var/log/inventory-service

# Expose port
EXPOSE 3002

# Start application
CMD ["node", "dist/main.js"]