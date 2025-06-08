const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

let socket;
let isLoggedIn = false;
let contactToMonitor = null;
let isContactOnline = false;
let lastSeenContact = [];
let lastSeenBot = null;
let qrData = '';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`\uD83C\uDF10 Servindo webapp em http://localhost:${port}`);
});

app.get('/qr', async (req, res) => {
  if (qrData) {
    const qrImage = await qrcode.toDataURL(qrData);
    res.send(`<html><body style="background:black; display:flex; align-items:center; justify-content:center; height:100vh;"><img src="${qrImage}" /></body></html>`);
  } else {
    res.send('<html><body style="background:black; color:white; display:flex; align-items:center; justify-content:center; height:100vh;"><h1>✅ Já logado!</h1></body></html>');
  }
});

app.post('/monitorar', async (req, res) => {
  if (!isLoggedIn) {
    console.log('❌ Tentativa de monitorar contato antes do login do bot.');
    return res.status(400).send('Erro: Bot ainda não está logado no WhatsApp.');
  }

  const { nomeOuTelefone } = req.body;
  if (!nomeOuTelefone) {
    console.log('❌ Nome ou telefone não fornecido.');
    return res.status(400).send('Erro: Nome ou telefone não fornecido.');
  }

  contactToMonitor = `${nomeOuTelefone}@s.whatsapp.net`;
  isContactOnline = false;
  lastSeenContact = [];
  try {
    await socket.presenceSubscribe(contactToMonitor);
    console.log(`🔎 Agora monitorando o número: ${contactToMonitor}`);
    res.send(`✅ Agora monitorando o número: ${nomeOuTelefone}.`);
  } catch (err) {
    console.error('Erro ao tentar monitorar contato:', err);
    res.status(500).send('Erro ao tentar monitorar contato');
  }
});

app.get('/status', (req, res) => {
  res.json({
    botStatus: isLoggedIn ? 'online' : 'offline',
    contactStatus: contactToMonitor ? (isContactOnline ? 'online' : 'offline') : 'nenhum contato configurado',
    lastSeenBot: lastSeenBot,
    lastSeenContact: lastSeenContact,
    monitorando: contactToMonitor || 'nenhum contato',
    botName: 'WhatsTracker Bot',
    contactName: contactToMonitor ? contactToMonitor.split('@')[0] : 'N/A'
  });
});

setInterval(() => {
  if (!isLoggedIn) {
    lastSeenBot = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }
}, 15000);

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['WhatsTracker', 'Chrome', '1.0']
  });

  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrData = qr;
      qrcodeTerminal.generate(qr, { small: true });
      console.log('🔵 QR Code gerado, escaneie! Também disponível em /qr');
    }

    if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp!');
      isLoggedIn = true;
      qrData = '';
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Conexão fechada. Reconnect?', shouldReconnect);
      if (shouldReconnect) {
        console.log('♻️ Tentando reconectar o bot...');
        startBot();
      } else {
        isLoggedIn = false;
        console.log('⚠️ Bot desconectado. Reinicie para novo login.');
      }
    }
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('presence.update', (update) => {
    const { id, presence } = update;
    if (contactToMonitor && id === contactToMonitor) {
      if (presence === 'available' || presence === 'composing' || presence === 'recording') {
        if (!isContactOnline) {
          console.log(`🟢 ${id} está ONLINE`);
        }
        isContactOnline = true;
      } else if (presence === 'unavailable') {
        if (isContactOnline) {
          const lastSeen = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          lastSeenContact.push(lastSeen);
          if (lastSeenContact.length > 10) lastSeenContact.shift();
          console.log(`⚪️ ${id} ficou OFFLINE às ${lastSeen}`);
        }
        isContactOnline = false;
      }
    }
  });
}

startBot().catch((err) => console.error('Erro ao iniciar bot', err));

