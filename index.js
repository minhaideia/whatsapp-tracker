const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

// arquivo de histórico das últimas presenças
const historyFile = path.join(__dirname, 'status_log.json');

const app = express();
const port = process.env.PORT || 3000;

let socket;
let qrData = '';

const presenceState = {
  botStatus: 'offline',
  contact: null,
  contactStatus: null,
  history: []
};

let isLoggedIn = false;
let contactToMonitor = null;
let isContactOnline = false;
let lastSeenBot = null;
let lastSeenContact = [];


// carrega histórico salvo (se existir)
if (fs.existsSync(historyFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(historyFile));
    presenceState.contact = data.contact || null;
    presenceState.history = Array.isArray(data.history) ? data.history : [];
    contactToMonitor = presenceState.contact;
    lastSeenContact = presenceState.history;

  } catch (e) {
    console.error('Erro ao ler histórico salvo', e);
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ao acessar /monitorar, servir a página HTML principal
app.get('/monitorar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
  if (presenceState.botStatus !== 'open') {

    console.log('❌ Tentativa de monitorar contato antes do login do bot.');
    return res.status(400).send('Erro: Bot ainda não está logado no WhatsApp.');
  }

  const { nomeOuTelefone } = req.body;
  if (!nomeOuTelefone) {
    console.log('❌ Nome ou telefone não fornecido.');
    return res.status(400).send('Erro: Nome ou telefone não fornecido.');
  }

  contactToMonitor = `${nomeOuTelefone}@s.whatsapp.net`;
  presenceState.contact = contactToMonitor;
  presenceState.contactStatus = null;
  presenceState.history = [];

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
    botStatus: presenceState.botStatus,
    contact: presenceState.contact,
    contactStatus: presenceState.contactStatus,
    history: presenceState.history,
    botName: 'WhatsTracker Bot'

  });
});

// API simples que retorna apenas o histórico de presenças
app.get('/api/presence', (req, res) => {
  res.json(presenceState);

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

    if (connection) {
      presenceState.botStatus = connection;
    }


    if (qr) {
      qrData = qr;
      qrcodeTerminal.generate(qr, { small: true });
      console.log('🔵 QR Code gerado, escaneie! Também disponível em /qr');
    }

    if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp!');
      isLoggedIn = true;
      presenceState.botStatus = 'open';

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
        presenceState.botStatus = 'close';

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
          const seen = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          presenceState.history.push(`${seen} – online`);
          if (presenceState.history.length > 10) presenceState.history.shift();
        }
        isContactOnline = true;
        presenceState.contactStatus = 'available';

      } else if (presence === 'unavailable') {
        if (isContactOnline) {
          const lastSeen = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          lastSeenContact.push(lastSeen);
          presenceState.history.push(`${lastSeen} – offline`);
          if (lastSeenContact.length > 10) lastSeenContact.shift();
          if (presenceState.history.length > 10) presenceState.history.shift();

          // salva historico em arquivo
          try {
            fs.writeFileSync(historyFile, JSON.stringify({
              contact: contactToMonitor,
              history: lastSeenContact
            }, null, 2));
          } catch (e) {
            console.error('Erro ao salvar histórico', e);
          }
          console.log(`⚪️ ${id} ficou OFFLINE às ${lastSeen}`);
        }
        isContactOnline = false;
        presenceState.contactStatus = 'unavailable';

      }
    }
  });
}

startBot().catch((err) => console.error('Erro ao iniciar bot', err));

