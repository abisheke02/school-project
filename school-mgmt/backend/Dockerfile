FROM node:20-alpine
WORKDIR /app

# Install dependencies
# Use npm install (not npm ci) — package-lock.json may not exist in all envs
COPY package*.json ./
RUN npm install --omit=dev --prefer-offline 2>/dev/null || npm install --omit=dev

# Copy source
COPY . .

EXPOSE 3001
CMD ["node", "src/index.js"]
