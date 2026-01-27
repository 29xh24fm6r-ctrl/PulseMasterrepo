FROM node:20-alpine

WORKDIR /app

# Copy the entire repo (Cloud Build context is repo root)
COPY . .

# Install dependencies
RUN npm install

# Cloud Run expects port 8080
ENV PORT=8080
EXPOSE 8080

# Start MCP service
CMD ["npm", "run", "start"]
