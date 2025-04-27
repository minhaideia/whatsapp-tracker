const { chromium } = require('playwright');
const fs = require('fs');

const CONTACT_NAME = "Beatriz RM MDB"; // 👈 Ajuste aqui o nome correto do contato
const TELEGRAM_TOKEN = '7548691102:AAH6nLWtiQT-UUqqtGrqWve3cHcCWc1aG_w';
const TELEGRAM_CHAT_ID = '7849408975';

async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text
    })
  });
}

(async () => {
  const browser = await chromium.launch({ headless: false }); // visível para debug
  const context = await browser.newContext({
    storageState: 'whatsapp-session.json' // agora usamos a sessão salva!
  });
  const page = await context.newPage();
  await page.goto('https://web.whatsapp.com');

  console.log('⏳ Carregando WhatsApp Web e monitorando contato:', CONTACT_NAME);

  await page.waitForTimeout(15000); // aguarda carregamento do WhatsApp Web

  try {
    await page.waitForSelector(`span[title="${CONTACT_NAME}"]`, { timeout: 30000 });
    await page.click(`span[title="${CONTACT_NAME}"]`);
    await page.waitForTimeout(3000);
  } catch (error) {
    console.error('❌ Erro ao clicar no contato na lista inicial:', error);
    await browser.close();
    return;
  }

  while (true) {
    try {
      if (!page.isClosed()) {
        const isOnline = await page.$('span[title="online"]');
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const formattedTime = now.toISOString().replace('T', ' ').substring(0, 19);

        if (isOnline) {
          console.log(`🟢 ONLINE - ${formattedTime}`);
        } else {
          console.log(`⚪ OFFLINE - ${formattedTime}`);
        }

        await page.waitForTimeout(1000); // Atualiza a cada 1 segundo
      } else {
        console.error('🚨 Página fechada. Encerrando monitoramento.');
        break;
      }
    } catch (error) {
      console.error('❌ Erro no monitoramento:', error);
      break;
    }
  }

  await browser.close();
})();