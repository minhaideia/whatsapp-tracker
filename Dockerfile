# Usar imagem base do Node.js slim
FROM node:20-slim

# Atualizar o sistema e instalar dependências necessárias
RUN apt-get update && apt-get install -y \
    chromium \
    xvfb \
    xauth \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libnspr4 \
    libnss3 \
    libxss1 \
    xdg-utils \
    wget \
    ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências Node.js
RUN npm install
RUN npx playwright install chromium

# Copiar todos os arquivos do projeto
COPY . .

# Expõe a porta que será usada (Render define via ENV)
ENV PORT=3000

# Starta o app rodando xvfb-run para permitir navegador sem tela
CMD xvfb-run --server-args="-screen 0 1024x768x24" npm start