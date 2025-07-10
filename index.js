import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fetch from 'node-fetch'; // Adicione esse import no topo do arquivo
import cron from 'node-cron';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configuração do banco de dados
const adapter = new JSONFile('db.json');
const defaultData = { aniversariantes: [] };
const db = new Low(adapter, defaultData);

async function initDB() {
  await db.read();
  await db.write();
}
initDB();

// Rota para adicionar aniversariante
app.post('/aniversariantes', async (req, res) => {
  const { nomeReal, nomeFantasia, discordTag, dataAniversario } = req.body;

  // Validação simples
  if (!nomeReal || !nomeFantasia || !discordTag || !dataAniversario) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios: nomeReal, nomeFantasia, discordTag, dataAniversario.' });
  }

  await db.read();
  db.data.aniversariantes.push({ nomeReal, nomeFantasia, discordTag, dataAniversario });
  await db.write();

  // Verifica se o aniversário é hoje
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const [ano, mesAniv, diaAniv] = dataAniversario.split('-');
  if (diaAniv === dia && mesAniv === mes) {
    await enviarParabensDiscord({ nomeReal, nomeFantasia, discordTag, dataAniversario });
  }

  res.status(201).json({ message: 'Aniversariante cadastrado!' });
});

// Rota para buscar aniversariantes do dia
app.get('/aniversariantes/hoje', async (req, res) => {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  await db.read();
  const aniversariantesHoje = db.data.aniversariantes.filter(a => {
    const [ano, mesAniv, diaAniv] = a.dataAniversario.split('-');
    return diaAniv === dia && mesAniv === mes;
  });

  // Envia parabéns para cada aniversariante do dia
  for (const aniversariante of aniversariantesHoje) {
    await enviarParabensDiscord(aniversariante);
  }

  res.json(aniversariantesHoje);
});

// Nova rota para buscar aniversariante pelo @ do Discord
app.get('/aniversariantes/discord/:discordTag', async (req, res) => {
  const { discordTag } = req.params;
  await db.read();
  const aniversariante = db.data.aniversariantes.find(a => a.discordTag === discordTag);
  if (!aniversariante) {
    return res.status(404).json({ message: 'Aniversariante não encontrado.' });
  }
  res.json(aniversariante);
});

// Rota para listar todos os aniversariantes (opcional, mas útil)
app.get('/aniversariantes', async (req, res) => {
  await db.read();
  res.json(db.data.aniversariantes);
});

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1392932338912067634/_buL4w92_eJfrFW-apqnbNLy9WHVz-ncjSazS4X0uTL8cBhLpkX_d3SHS1CZPZS7UrYV';

// Função para enviar mensagem de parabéns
async function enviarParabensDiscord(aniversariante) {
  const mensagem = {
    content: `🎉 Parabéns, ${aniversariante.nomeFantasia} (${aniversariante.nomeReal})! Hoje é seu aniversário! Mande um salve para ${aniversariante.discordTag} no Discord! 🥳`
  };

  await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mensagem)
  });
}

// Agendamento automático: envia parabéns todos os dias às 9h
cron.schedule('0 9 * * *', async () => {
  await db.read();
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const aniversariantesHoje = db.data.aniversariantes.filter(a => {
    const [ano, mesAniv, diaAniv] = a.dataAniversario.split('-');
    return diaAniv === dia && mesAniv === mes;
  });
  for (const aniversariante of aniversariantesHoje) {
    await enviarParabensDiscord(aniversariante);
  }
  if (aniversariantesHoje.length > 0) {
    console.log('Parabéns enviados automaticamente para aniversariantes do dia!');
  }
});

app.listen(3001, () => {
  console.log('API rodando na porta 3001');
});