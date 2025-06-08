# WhatsTracker Bot

Monitore o status online de um contato do WhatsApp usando a biblioteca Baileys.

## Instalação

```bash
npm install
```

## Uso

1. Execute `npm start` ou `node index.js`.
2. Abra `http://localhost:3000/qr` e escaneie o código QR exibido.
3. Visite `http://localhost:3000` para informar o número a ser monitorado.
4. A interface exibirá o status do bot e do contato em tempo real.

### Endpoints

- `POST /monitorar` – inicia o monitoramento enviando JSON `{ "nomeOuTelefone": "<numero>" }`.
- `GET /status` – retorna informações do bot e histórico de `last seen`.

O bot mantém a sessão no diretório `auth_info_baileys`, permitindo o uso em servidores sem interface gráfica.

