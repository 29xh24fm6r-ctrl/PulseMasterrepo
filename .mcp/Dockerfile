FROM node:20-alpine

WORKDIR /app

# Copy only MCP package files
COPY .mcp/package.json ./

RUN npm install --production

# Copy MCP source
COPY .mcp/server.js ./

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
