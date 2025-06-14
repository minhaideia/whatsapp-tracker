FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV PORT=3000
CMD ["node", "index.js"]
