const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Low, JSONFile } = require('lowdb');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configuração do banco de dados
const adapter = new JSONFile('db.json');
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data ||= { aniversariantes: [] };
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

app.listen(3001, () => {
  console.log('API rodando na porta 3001');
});