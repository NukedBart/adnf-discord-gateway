require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { InteractionType, InteractionResponseType, verifyKeyMiddleware } = require('discord-interactions');
const https = require('follow-redirects').https;
const fs = require('fs');

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
		},
		{
		  "name": "password",
          "description": "Enter your password",
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
		},
		{
		  "name": "password",
          "description": "Enter your password",
          "type": 3,  // 3 represents STRING type
          "required": true
		}
      ]
    },
    {
      "name": "relink",
      "description": "Change the Discord account linked to ADNF",
      "options": [
		{
		  "name": "username",
          "description": "Enter your username",
          "type": 3,  // 3 represents STRING type
          "required": true
		},
		{
		  "name": "password",
          "description": "Enter your password",
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
		  "name": "userid",
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
      "id": "1127447095893315596",
      "name": "relink",
      "description": "Change the Discord account linked to ADNF",
      "options": [{"isPublic": true}]
    },
    {
      "id": "1127487633975693387",
      "name": "mention",
      "description": "[ADMIN] It helps locating a player.",
      "options": [{"isPublic": false}]
    }
  ];

const sendPublic = (pending_content, res) => {
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: pending_content
    }
  });
}

const sendPrivate = (pending_content, res) => {
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: pending_content,
      flags: 64
    }
  });
}

const parseCommands = (commands, isAdmin=false, index = 0) => {
  if (index >= commands.length) 
    return '';
  
  const command = commands[index];
  const formattedCommand = `</${command.name}:${command.id}>  ${command.description}\n`;
  
  if(command.options.isPublic) 
    return formattedCommand + parseCommands(commands, isAdmin, index + 1);
    
  if(isAdmin) 
    return formattedCommand + parseCommands(commands, isAdmin, index + 1);
    
  return parseCommands(commands, isAdmin, index + 1);
}

const hasAdminRole = async (req, res) => {
  try {
    const guildId = req.body.guild.id; // get server ID
    const rolesResponse = await discordApi.get(`/guilds/${guildId}/roles`); // get server roles
    const roles = rolesResponse.data; // get roles raw data
    // roles are now accessible
    console.log(roles);

    return req.body.member.roles.some(roleId => roles.find(role => role.id === roleId)?.name === 'Staff');
  } catch (error) {
    console.error('Error fetching guild roles:', error);
    return false;
  }
}

const isAlphanumeric = (string) => {
  const regex = /^[a-zA-Z0-9]{6,16}$/;
  return regex.test(string);
}

const checkPasswordStrength = (string) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;
  return regex.test(string);
}

const processRegister = (username, password, discordUsername, userId) => {
  if (!isAlphanumeric(username)) return '4062';
  if (!checkPasswordStrength(password)) return '4063';
  const options = {
    method: 'POST',
    hostname: 'adnf.ucany.net',
    port: 443,
    path: '/api/register',
    headers: {
      'Content-Type': 'multipart/form-data; boundary=botRegisterRequest'
    }
  };
  
  // Construct the request payload
  const postData = `--botRegisterRequest\r\nContent-Disposition: form-data; name='username'\r\n\r\n${username}\r\n--botRegisterRequest\r\nContent-Disposition: form-data; name='password'\r\n\r\n${password}\r\n--botRegisterRequest\r\nContent-Disposition: form-data; name='discord'\r\n\r\n${discordUsername}\r\n--botRegisterRequest\r\nContent-Disposition: form-data; name='discordid'\r\n\r\n${userId}\r\n--botRegisterRequest--`;
  
  // Send the HTTP request
  const httpsRequest = https.request(options, function (response) {
    const chunks = [];
  
    response.on('data', function (chunk) {
      chunks.push(chunk);
    });
  
    response.on('end', function (chunk) {
      const body = Buffer.concat(chunks);
      return body.toString();
    });
  
    response.on('error', function (error) {
      console.error(error);
      return '5000';
    });
  });
}

// handle /help
const handleHelpCommand = async (req, res) => {
  let isAdmin = await hasAdminRole(req, res);
  sendPrivate(parseCommands(clickable_slash_commands, isAdmin));
};

// handle /register
const handleRegisterCommand = (req, res) => {
  // Access the value of parameters from the request body
  const username = req.body.data.options.find(option => option.name === 'username').value;
  const password = req.body.data.options.find(option => option.name === 'password').value;
  const discordUsername = req.body.member.user.username;
  const userId = req.body.member.user.id;
  const discriminator = req.body.member.user.discriminator;
  
  // Use the values as needed
  console.log('Username:', username);
  console.log('Issuer:', discordUsername, '#', discriminator, ' (', userId, ')');
  
  const result = processRegister(username, password, discordUsername + discriminator, userId);
  
  switch (result)
  {
  case '4061':
    sendPrivate(`<@${userId}> That usename has already been taken. Try another one.`, res);
    break;
  case '4062':
    sendPrivate(`<@${userId}> That usename is invalid. \nA valid username should only contain A-Z, a-z, 0-9; and should contain at least 6 characters; and 16 characters maximum. \nEx. Validname123`, res);
    break
  case '4063':
    sendPrivate(`<@${userId}> The provided password is either invalid or not secure enough. \nYour password should be: \n -At least 8 characters long. \n -Contain an upper-case letter. \n -Contain a lower-case letter. \n -Contain a number. \n -64 characters maximum. \n Ex. Val1dpassw0rd`, res);
    break;
  case 'bruh':
    sendPrivate(`<@${userId}> Sorry, but an unknown error had occurred.`, res);
    break
  case '5000':
    sendPrivate(`<@${userId}> Sorry, but an unknown error had occurred.`, res);
    break;
  case '200':
    sendPrivate(`<@${userId}> Your ADNF account ${username} with password ||${password}|| is now ready and linked to ${discordUsername}#${discriminator}<${userId}> !`, res);
    break;
  default:
    sendPrivate(`<@${userId}> Sorry, but an unknown error had occurred.`, res);
    break;
  }
};

// handle /link
const handleLinkCommand = (req, res) => {
  // Access the value of 'username' parameter from the request body
  const username = req.body.data.options.find(option => option.name === 'username').value;
  const password = req.body.data.options.find(option => option.name === 'password').value;
  const discordUsername = req.body.member.user.username;
  const userId = req.body.member.user.id;
  const discriminator = req.body.member.user.discriminator;
  
  // Use the 'username' value as needed
  console.log('Username:', username);
  console.log('Issuer:', discordUsername);
  
  // TODO: add link function

  sendPrivate(`${discordUsername} Link command received. Username: ${username}, Password: ||${password}||`, res);
};

// handle /relink
const handleRelinkCommand = (req, res) => {
  // Access the value of 'username' parameter from the request body
  const username = req.body.data.options.find(option => option.name === 'username').value;
  const password = req.body.data.options.find(option => option.name === 'password').value;
  const discordUsername = req.body.member.user.username;
  const userId = req.body.member.user.id;
  const discriminator = req.body.member.user.discriminator;
  
  // Use the 'username' value as needed
  console.log('Username:', username);
  console.log('Issuer:', discordUsername);

  // TODO: add relink function

  sendPrivate(`${discordUsername} Relink command received. Username: ${username}, Password: ||${password}||`, res);
};

// handle /mention
const handleMentionCommand = async (req, res) => {
  let isAdmin = await hasAdminRole(req, res);
  const mentionedUserId = req.body.data.options.find(option => option.name === 'userid')?.value;
  if (!isAdmin) {
    sendPrivate('You do not have permission to use this command.', res);
    return;
  }
  if (!mentionedUserId) {
    sendPrivate('Please provide a valid user ID.', res);
    return;
  }
  sendPublic(`Hey <@${mentionedUserId}>! One of our admins had mentioned you! Is something bad happening?`, res);
};

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;

  if (interaction.type !== InteractionType.APPLICATION_COMMAND) return;
  const { name } = interaction.data;

  switch (name) 
  {
  case 'help':
    handleHelpCommand(req, res);
    break;
  case 'register':
    handleRegisterCommand(req, res);
    break;
  case 'link':
    handleLinkCommand(req, res);
    break;
  case 'relink':
    handleRelinkCommand(req, res);
    break;
  case 'mention':
    handleMentionCommand(req, res);
    break;
  default:
    sendPublic('Invalid command!', res);
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
