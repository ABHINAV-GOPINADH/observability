FROM node:18-alpine

ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com/
ENV NPM_CONFIG_STRICT_SSL=false
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

WORKDIR /workspace/gateway-service

# Copy package files from service and shared local package
COPY ./gateway-service/package*.json ./
COPY ./shared/observability ../shared/observability

# Install shared observability package dependencies first
RUN cd ../shared/observability && npm install --strict-ssl=false && cd /workspace/gateway-service

# Install all dependencies for build (including devDependencies needed for TypeScript compilation)
RUN npm install --strict-ssl=false

# Copy application code and build
COPY ./gateway-service .
RUN npm run build

# Remove dev dependencies for smaller production image
RUN npm prune --omit=dev

FROM node:18-alpine
WORKDIR /app

COPY --from=0 /workspace/gateway-service/dist ./dist
COPY --from=0 /workspace/gateway-service/node_modules ./node_modules
COPY ./gateway-service/package*.json ./

RUN mkdir -p /var/log/gateway-service

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main.js"]