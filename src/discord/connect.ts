import { Client, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';
dotenv.config();

const token = process.env['DISCORD_TOKEN'] || '';
export const clientId = process.env['CLIENT_ID'] || '';

const discordClient = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

discordClient.once('ready', () => {
	console.log('Discord Client Ready!');
});

await discordClient.login(token);

export { discordClient };
