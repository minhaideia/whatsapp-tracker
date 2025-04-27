let lastSeen = null;
const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

let qrCodeData = null;
let isLoggedIn = false;

// Inicia o cliente WhatsApp com sessão salva automaticamente
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

client.on('qr', (qr) => {
  console.log('🔵 QR gerado. Escaneie para login.');
  qrCodeData = qr;
});

client.on('ready', () => {
  console.log('✅ Cliente WhatsApp pronto!');
  isLoggedIn = true;
  qrCodeData = null;
});

client.on('auth_failure', (msg) => {
  console.error('❌ Falha na autenticação:', msg);
  isLoggedIn = false;
});

client.initialize();

// Servir a pasta public
app.use(express.static('public'));

// Endpoint para ver o QR Code
app.get('/qr', async (req, res) => {
  if (qrCodeData) {
    const qrImage = await qrcode.toDataURL(qrCodeData);
    res.send(`<html><body style="background:black; display:flex; align-items:center; justify-content:center; height:100vh;"><img src="${qrImage}" /></body></html>`);
  } else {
    res.send('<html><body style="background:black; color:white; display:flex; align-items:center; justify-content:center; height:100vh;"><h1>✅ Já logado!</h1></body></html>');
  }
});

// Endpoint para o status
app.get('/status', (req, res) => {
  res.json({ 
    status: isLoggedIn ? 'online' : 'offline',
    lastSeen: lastSeen
  });
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`🌐 Servindo webapp em http://localhost:${port}`);
});

setInterval(() => {
  if (!isLoggedIn) {
    lastSeen = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }
}, 15000);