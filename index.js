import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import cron from 'node-cron';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Conexão com MongoDB Atlas
const mongoUser = 'higor1992';
const mongoPassword = process.env.DB_PASSWORD || '<db_password>';
const mongoUri = `mongodb+srv://${mongoUser}:${mongoPassword}@cluster0.bfrpiss.mongodb.net/aniversariantes?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(mongoUri, {});

const aniversarianteSchema = new mongoose.Schema({
  nomeReal: { type: String, required: true },
  nomeFantasia: { type: String, required: true },
  discordTag: { type: String, required: true },
  dataAniversario: { type: String, required: true }, // formato: YYYY-MM-DD
});

const Aniversariante = mongoose.model('Aniversariante', aniversarianteSchema);

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

// Rota para adicionar aniversariante
app.post('/aniversariantes', async (req, res) => {
  const { nomeReal, nomeFantasia, discordTag, dataAniversario } = req.body;
  if (!nomeReal || !nomeFantasia || !discordTag || !dataAniversario) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios: nomeReal, nomeFantasia, discordTag, dataAniversario.' });
  }
  try {
    const novo = new Aniversariante({ nomeReal, nomeFantasia, discordTag, dataAniversario });
    await novo.save();
    // Verifica se o aniversário é hoje
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const [ano, mesAniv, diaAniv] = dataAniversario.split('-');
    if (diaAniv === dia && mesAniv === mes) {
      await enviarParabensDiscord(novo);
    }
    res.status(201).json({ message: 'Aniversariante cadastrado!' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao cadastrar aniversariante.', error: err.message });
  }
});

// Rota para buscar aniversariantes do dia
app.get('/aniversariantes/hoje', async (req, res) => {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  try {
    const aniversariantesHoje = await Aniversariante.find({
      dataAniversario: { $regex: `^\d{4}-${mes}-${dia}$` }
    });
    for (const aniversariante of aniversariantesHoje) {
      await enviarParabensDiscord(aniversariante);
    }
    res.json(aniversariantesHoje);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar aniversariantes do dia.', error: err.message });
  }
});

// Rota para buscar aniversariante pelo @ do Discord
app.get('/aniversariantes/discord/:discordTag', async (req, res) => {
  const { discordTag } = req.params;
  try {
    const aniversariante = await Aniversariante.findOne({ discordTag });
    if (!aniversariante) {
      return res.status(404).json({ message: 'Aniversariante não encontrado.' });
    }
    res.json(aniversariante);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar aniversariante.', error: err.message });
  }
});

// Rota para listar todos os aniversariantes
app.get('/aniversariantes', async (req, res) => {
  try {
    const aniversariantes = await Aniversariante.find();
    res.json(aniversariantes);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar aniversariantes.', error: err.message });
  }
});

// Agendamento automático: envia parabéns todos os dias às 9h
cron.schedule('0 9 * * *', async () => {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  try {
    const aniversariantesHoje = await Aniversariante.find({
      dataAniversario: { $regex: `^\d{4}-${mes}-${dia}$` }
    });
    for (const aniversariante of aniversariantesHoje) {
      await enviarParabensDiscord(aniversariante);
    }
    if (aniversariantesHoje.length > 0) {
      console.log('Parabéns enviados automaticamente para aniversariantes do dia!');
    }
  } catch (err) {
    console.error('Erro no agendamento automático:', err.message);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});