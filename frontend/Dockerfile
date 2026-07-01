# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Accept the API URL as a build argument
ARG VITE_API_URL=http://localhost:8080/api
ENV VITE_API_URL=$VITE_API_URL

# Build the app for production
RUN npm run build

# Stage 2: Serve the application via Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
