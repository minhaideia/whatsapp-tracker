# WhatsTracker Bot

Monitore o status online de um contato do WhatsApp usando a biblioteca Baileys.

## Instalação

```bash
npm install
```

Em seguida execute `npm start` para iniciar o servidor.

## Uso

1. Execute `npm start` ou `node index.js`.
2. Abra `http://localhost:3000/qr` e escaneie o código QR exibido.
3. Visite `http://localhost:3000/monitorar` para informar o número a ser monitorado (ou acesse via `GET /monitorar`).

- `GET /api/presence` – retorna o estado atual do bot e do contato monitorado.

### Endpoints

- `POST /monitorar` – inicia o monitoramento enviando JSON `{ "nomeOuTelefone": "<numero>" }`.
- `GET /status` – retorna informações do bot e histórico de `last seen`.
- `GET /api/presence` – histórico simplificado usado pela interface.
- `GET /monitorar` – página HTML para configurar o número.


O bot mantém a sessão no diretório `auth_info_baileys`, permitindo o uso em servidores sem interface gráfica. O histórico de "last seen" é salvo em `status_log.json` para persistir entre reinícios.

