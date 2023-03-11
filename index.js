const { join } = require('node:path');
const { readdirSync } = require('node:fs');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { config } = require('dotenv');

config();
const token = process.env.TOKEN;

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.commands = new Collection();

// Retrieve command files from the commands directory
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter((file) =>
  file.endsWith('.js'),
);

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
    );
  }
}

// Retrieve event files from the events directory
const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter((file) =>
  file.endsWith('.js'),
);

for (const file of eventFiles) {
  const filePath = join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Log into Discord w/ client token
client.login(token);
