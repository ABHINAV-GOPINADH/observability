FROM node:18-alpine

ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com/
ENV NPM_CONFIG_STRICT_SSL=false
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

WORKDIR /workspace/billing-service

# Copy package files from service and shared local package
COPY ./billing-service/package*.json ./
COPY ./shared/observability ../shared/observability

# Install shared observability package dependencies first
RUN cd ../shared/observability && npm install --strict-ssl=false && cd /workspace/billing-service

# Install all dependencies for build (including devDependencies needed for TypeScript compilation)
RUN npm install --strict-ssl=false

# Copy application code and build
COPY ./billing-service .
RUN npm run build

# Remove dev dependencies for smaller production image
RUN npm prune --omit=dev

FROM node:18-alpine
WORKDIR /app

COPY --from=0 /workspace/billing-service/dist ./dist
COPY --from=0 /workspace/billing-service/node_modules ./node_modules
COPY ./billing-service/package*.json ./

RUN mkdir -p /var/log/billing-service

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "dist/main.js"]