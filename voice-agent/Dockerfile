FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build
RUN npm run build

# Expose port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
