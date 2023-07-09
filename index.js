require('dotenv').config();
const https = require('https');
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const { InteractionType, InteractionResponseType, verifyKeyMiddleware } = require('discord-interactions');

const app = express();
app.use(express.json());

const discordApi = axios.create({
  baseURL: 'https://discord.com/api/',
  timeout: 3000,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
    "Access-Control-Allow-Headers": "Authorization",
    "Authorization": `Bot ${process.env.TOKEN}`
  }
});

// 添加请求拦截器
discordApi.interceptors.request.use((config) => {
  console.log('Making request to Discord API:', config.url);
  return config;
}, (error) => {
  console.error('Error in request:', error);
  return Promise.reject(error);
});

// 添加响应拦截器
discordApi.interceptors.response.use((response) => {
  console.log('Received response from Discord API:', response.config.url);
  return response;
}, (error) => {
  console.error('Error in response:', error);
  return Promise.reject(error);
});

const port = process.env.PORT || 3131;
const sslOptions = {
  key: fs.readFileSync('private.key'),
  cert: fs.readFileSync('certificate.crt'),
};

const server = https.createServer(sslOptions, app);

const slash_commands = [
    {
      "name": "help",
      "description": "Displays this help information",
      "options": []
    },
    {
      "name": "register",
      "description": "Use the current Discord account to register an ADNF account",
      "options": []
    },
    {
      "name": "link",
      "description": "Link your Discord account to ADNF",
      "options": []
    }
  ];

const parseCommands = (commands, index = 0) => {
  if (index >= commands.length) {
    return '';
  }
  const command = commands[index];
  const formattedCommand = `[/${command.name}](command:${command.name})  ${command.description}\n`;

  return formattedCommand + parseCommands(commands, index + 1);
}

// handle /help
const handleHelpCommand = (req, res) => {
  const formattedCommands = parseCommands(slash_commands);
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: formattedCommands
    }
  });
};

// handle /register
const handleRegisterCommand = (req, res) => {
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: 'This is the register command!'
    }
  });
};

// handle /link
const handleLinkCommand = (req, res) => {
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: 'This is the link command!'
    }
  });
};

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data;

    switch (name) {
      case 'help':
        handleHelpCommand(req, res);
        break;
      case 'register':
        handleRegisterCommand(req, res);
        break;
      case 'link':
        handleLinkCommand(req, res);
        break;
      default:
        res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Invalid command!'
          }
        });
    }
  }
});

app.get('/register_commands', async (req, res) => {
  try {
    const discordResponse = await discordApi.put(`/applications/${process.env.APPLICATION_ID}/guilds/${process.env.GUILD_ID}/commands`, slash_commands);
    console.log(discordResponse.data);
    return res.send('Commands have been registered');
  } catch (error) {
    console.error(error.code);
    console.error(error.response?.data);
    return res.send(`${error.code} error from Discord`);
  }
});

app.get('/', async (req, res) => {
  return res.send('ADNF Discord Bot by NukedBart');
});

server.listen(port, () => {
  console.log(`Application is running on port ${port}`);
});
