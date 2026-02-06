# Use Node.js
FROM node:22-slim

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Set working directory
WORKDIR /app

# Copy package.json
COPY package.json ./

# Install dependencies with npm
RUN npm install

# Copy source code
COPY . .

# Run the bot with tsx
CMD ["npx", "tsx", "src/index.ts"]
