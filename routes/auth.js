const express = require('express');
const passport = require('passport');
const { google } = require('googleapis');
const router = express.Router();
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Inicializar Passport com Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
  scope: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/calendar.events'
  ]
},
  function (accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Rota para iniciar login com Google
router.get('/google', passport.authenticate('google', { 
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.events'
    ] 
  }));

// Rota de callback depois do login
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/'); // Redireciona após login
  }
);

// Rota para criar evento no Google Calendar
router.post('/criar-evento', async (req, res) => {
  const { accessToken } = req.user;

  if (!accessToken) {
    return res.status(401).send('Usuário não autenticado');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const eMailCliente = req.body.emailCliente;
  const eMailEmpresa = 'email_da_empresa@dominio.com'; // E-mail fixo da empresa

  const event = {
    summary: req.body.nome,
    location: 'Local do salão',
    description: `Serviços: ${req.body.servicos}`,
    start: {
      dateTime: req.body.dataInicio,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: req.body.dataFim,
      timeZone: 'America/Sao_Paulo',
    },
    attendees: [
      { email: eMailCliente },
      { email: eMailEmpresa },
    ],
    reminders: {
      useDefault: true,
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.json({ message: 'Evento criado com sucesso!', eventLink: response.data.htmlLink });
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    res.status(500).send('Erro ao criar evento no Google Calendar');
  }
});

module.exports = router;