import { REST, Routes } from 'discord.js';
import { timeCommand } from '../commands/time-command/time-command';
import { pingCommand } from '../commands/ping-command/ping-command';
import { mafiaCommand } from '../commands/mafia-command/mafia-command';
import { nominateCommand } from '../commands/nominate-command/nominate-command';
import * as dotenv from 'dotenv';
dotenv.config();

const token = process.env['DISCORD_TOKEN'];
const clientId = process.env['CLIENT_ID'];

if (token === undefined || clientId === undefined) {
	throw new Error(
		`parameter is not defined : clientId = ${clientId ?? ''} || token = ${
			token ?? ''
		}`,
	);
}

export const deployCommands = async () => {
	console.log('Deploying commands...');
	const commands = [
		mafiaCommand,
		nominateCommand,
		timeCommand,
		pingCommand,
	].map((command) => command.toJSON());

	const rest = new REST({ version: '10' }).setToken(token);

	try {
		const data = await rest.put(Routes.applicationCommands(clientId), {
			body: commands,
		});

		console.log(
			`Successfully reloaded ${
				(data as string[]).length
			} application (/) commands.`,
		);
	} catch (error) {
		console.log('Error while refreshing application (/) commands');
		console.error(error);
	}
};
