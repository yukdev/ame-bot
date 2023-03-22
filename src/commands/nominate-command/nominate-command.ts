import { SlashCommandBuilder } from 'discord.js';

export const nominateCommand = new SlashCommandBuilder()
	.setName('nominate')
	.setDescription('Nominate a player to be hanged.')
	.addUserOption((option) =>
		option
			.setName('selected')
			.setDescription('The player to nominate')
			.setRequired(true),
	);
