FROM node:20-slim

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

ENV PORT=8080
EXPOSE 8080
CMD ["npm","run","start"]
