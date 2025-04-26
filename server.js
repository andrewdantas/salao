const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const authRoutes = require('./routes/auth'); // Arquivo de autenticação (auth.js)
const { google } = require('googleapis'); // Importando a biblioteca para o Google Calendar
const app = express();
const PORT = process.env.PORT || 3000;

// Para aceitar JSON no body
app.use(express.json());

// Configurar sessão
app.use(session({
  secret: 'seu-segredo-salao', // Troque por algo mais seguro
  resave: false,
  saveUninitialized: true
}));

// Configurar Passport
app.use(passport.initialize());
app.use(passport.session());

// Liberar CORS para frontend local
app.use(cors());

// Servir seu frontend
app.use(express.static(path.join(__dirname)));

// Rotas de autenticação
app.use('/auth', authRoutes);

// Rota para criação de evento
app.post('/criar-evento', async (req, res) => {
  console.log('Requisição recebida em /criar-evento');
  try {
    const { nome, telefone, servicos, dataInicio, dataFim, emailCliente } = req.body;
    
    // Verifique se o usuário está autenticado (via Passport)
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({ mensagem: 'Usuário não autenticado' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: req.user.accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // E-mail da empresa
    const eMailEmpresa = 'nandashalomadonai@gmail.com'; // E-mail fixo da empresa

    const event = {
      summary: nome,
      location: 'Local do salão', // Ou um valor dinâmico
      description: `Serviços: ${servicos}`,
      start: {
        dateTime: dataInicio, // Deve ser uma data no formato ISO
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: dataFim, // Deve ser uma data no formato ISO
        timeZone: 'America/Sao_Paulo',
      },
      attendees: [
        { email: emailCliente }, // E-mail do cliente (se você o coletou do formulário)
        { email: eMailEmpresa }, // E-mail da empresa
      ],
      reminders: {
        useDefault: true,
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary', // Calendar principal do usuário
      resource: event,
    });

    res.json({ mensagem: 'Evento criado com sucesso!', eventLink: response.data.htmlLink });
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    res.status(500).json({ mensagem: 'Erro ao criar evento.' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});