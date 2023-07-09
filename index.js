require('dotenv').config();
const express = require('express');
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

const slash_commands = [
    {
      "name": "help",
      "description": "Displays this help information",
      "options": []
    },
    {
      "name": "register",
      "description": "Use the current Discord account to register an ADNF account",
      "options": [
		{
		  "name": "username",
          "description": "Enter your username",
          "type": 3,  // 3 represents STRING type
          "required": true
		}
      ]
    },
    {
      "name": "link",
      "description": "Link your Discord account to ADNF",
      "options": [
		{
		  "name": "username",
          "description": "Enter your username",
          "type": 3,  // 3 represents STRING type
          "required": true
		}
      ]
    },
    {
      "name": "mention",
      "description": "[ADMIN] It helps locating a player.",
      "options": [
		{
		  "name": "User ID",
          "description": "Enter the user ID you want to mention",
          "type": 3,  // 3 represents STRING type
          "required": true
		}
      ]
    }
  ];
  
const clickable_slash_commands = [
    {
      "id": "1127447095893315594",
      "name": "help",
      "description": "Displays this help information",
      "options": [{"isPublic": true}]
    },
    {
      "id": "1127447095893315595",
      "name": "register",
      "description": "Use the current Discord account to register an ADNF account",
      "options": [{"isPublic": true}]
    },
    {
      "id": "1127447095893315596",
      "name": "link",
      "description": "Link your Discord account to ADNF",
      "options": [{"isPublic": true}]
    },
    {
      "id": "1127447095893315597",
      "name": "mention",
      "description": "[ADMIN] It helps locating a player.",
      "options": [{"isPublic": false}]
    }
  ];

const parseCommands = (isAdmin, commands, index = 0) => {
  if (index >= commands.length) {
    return '';
  }
  const command = commands[index];
  const formattedCommand = `</${command.name}:${command.id}>  ${command.description}\n`;
  
  if(command.options.isPublic) {
    return formattedCommand + parseCommands(commands, index + 1);
  }
  if(isAdmin) {
    return formattedCommand + parseCommands(commands, index + 1);
  }
  return parseCommands(commands, index + 1);
}

// handle /help
const handleHelpCommand = (req, res) => {
  const isAdmin = req.body.member.user.roles.includes('admin');
  const formattedCommands = parseCommands(isAdmin, clickable_slash_commands);
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: formattedCommands,
      flags: 64
    }
  });
};

// handle /register
const handleRegisterCommand = (req, res) => {
  // Access the value of 'username' parameter from the request body
  const username = req.body.data.options.find(option => option.name === 'username').value;
  const discordUsername = req.body.member.user.username;
  const userId = req.body.member.user.id;
  const discriminator = req.body.member.user.discriminator;
  
  // Use the 'username' value as needed
  console.log('Username:', username);
  console.log('Issuer:', discordUsername, "#", discriminator, " (", userId, ")");
  
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `${discordUsername} Register command received. Username: ${username}`,
      flags: 64 // Set the Ephemeral flag to make the message visible only to the user
    }
  });
};

// handle /link
const handleLinkCommand = (req, res) => {
  // Access the value of 'username' parameter from the request body
  const username = req.body.data.options.find(option => option.name === 'username').value;
  const discordUsername = req.body.member.user.username;
  const userId = req.body.member.user.id;
  const discriminator = req.body.member.user.discriminator;
  
  // Use the 'username' value as needed
  console.log('Username:', username);
  console.log('Issuer:', discordUsername);

  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `${discordUsername} Link command received. Username: ${username}`,
      flags: 64
    }
  });
};

// handle /mention
const handleMentionCommand = (req, res) => {
  //const isAdmin = req.body.member.user.roles.includes('admin');
  const mentionedUserId = req.body.data.options.find(option => option.name === 'id')?.value;
  console.log(req.body.member.user);
  /*if (!isAdmin) {
    res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'You do not have permission to use this command.',
        flags: 64
      }
    });
    return;
  }

  if (!mentionedUserId) {
    res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Please provide a valid user ID.',
        flags: 64
      }
    });
    return;
  }

  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Hey <@${mentionedUserId}>! One of our admins had mentioned you! Is something bad happening?`
    }
  });*/
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
      case 'mention':
        handleMentionCommand(req, res);
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

app.listen(port, () => {
  console.log(`Application is running on port ${port}`);
});
