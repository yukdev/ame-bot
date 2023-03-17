import {
	Client,
	Events,
} from 'discord.js';
import { timeResponse } from './time-command/time-response';
import { pingResponse } from './ping-command/ping-response';

export function setUpResponses(client: Client) {
	console.log('Setting up responses');

	client.on(Events.InteractionCreate, async (interaction) => {
		if (!interaction.isChatInputCommand()) return;

		const { commandName } = interaction;

		switch (commandName) {
			case 'time':
				await timeResponse(interaction).catch(console.error);
				break;
			case 'ping':
				await pingResponse(interaction).catch(console.error);
				break;
			default:
				console.error(`Could not find ${commandName}`);
				break;
		}
	});
}
