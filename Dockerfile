# Usar imagem oficial Playwright já com Chromium
FROM mcr.microsoft.com/playwright:v1.43.0-jammy

# Criar diretório de trabalho
WORKDIR /app

# Copiar arquivos
COPY package.json package-lock.json* ./
COPY index.js .
COPY whatsapp-session.json .

# Instalar dependências
RUN npm install

# Variáveis padrão
ENV PORT=3000
ENV PLAYWRIGHT_BROWSERS_PATH=0

# Rodar o app
CMD ["npm", "start"]