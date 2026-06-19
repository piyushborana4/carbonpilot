# ==========================================
# Stage 1: Build Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency catalogs
COPY package*.json ./

# Install all dependencies including devDependencies for compilation
RUN npm ci

# Copy the rest of the application files
COPY . .

# Compile the React frontend and express backend bundle
RUN npm run build


# ==========================================
# Stage 2: Clean Production Stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Ensure production environment
ENV NODE_ENV=production

# Copy configuration manifests
COPY package*.json ./

# Install only production dependencies to keep the image compact
RUN npm ci --only=production

# Copy static assets and compiled backend runner from builder stage
COPY --from=builder /app/dist ./dist

# Optional: Copy additional assets/directories if required by server at runtime
# In this app, everything compiled on build phase resides in the dist/ folder.

# Expose default HTTP Port (Cloud Run dynamically forwards traffic to PORT variable)
EXPOSE 3000

# Run the production bundle
CMD ["npm", "start"]
