import { games } from '../../shared/globals';

import {
	ChatInputCommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
} from 'discord.js';

import { promptDefense } from '../../utils/gameLogic';

export const nominateResponse = async (
	interaction: ChatInputCommandInteraction,
) => {
	const channel = interaction.channel;
	if (!channel) {
		await interaction.reply({
			content: 'There was an error with your request.',
			ephemeral: true,
		});
		return;
	}

	const [channelId, guildId] = [interaction.channelId, interaction.guildId];
	const gameId = `${guildId}-${channelId}`;

	const game = games[gameId];

	if (!game) {
		await interaction.reply({
			content: 'There is no game in progress.',
			ephemeral: true,
		});
		return;
	}

	// Case for when game is not in nomination phase
	if (game.state !== 'nomination') {
		await interaction.reply({
			content: 'You cannot nominate a player at this time.',
			ephemeral: true,
		});
		return;
	}

	const nominatingPlayerDiscord = interaction.user;
	const nominatingPlayer = game.players.find(
		(p) => p.id === nominatingPlayerDiscord.id,
	);
	// Case for when nominating player is not in game
	if (!nominatingPlayer) {
		await interaction.reply({
			content: 'You are not in this game!',
			ephemeral: true,
		});
		return;
	}
	const accusedPlayerDiscord = interaction.options.getUser('selected');

	// Case for when no player is selected
	if (!accusedPlayerDiscord) {
		await interaction.reply('Please select a player to nominate.');
		return;
	}

	const accusedPlayer = game.players.find(
		(p) => p.id === accusedPlayerDiscord.id,
	);

	if (!accusedPlayer) {
		await interaction.reply({
			content: 'That player is not in this game.',
			ephemeral: true,
		});
		return;
	}

	// Case for dead player trying to nominate
	if (!nominatingPlayer.isAlive) {
		await interaction.reply({
			content: 'Dead players cannot nominate!',
			ephemeral: true,
		});
		return;
	}

	// Case for nominating dead player
	if (!accusedPlayer.isAlive) {
		await interaction.reply({
			content: 'You cannot nominate a dead player!',
			ephemeral: true,
		});
		return;
	}

	// Case for when player tries to nominate themselves
	if (accusedPlayerDiscord.id === nominatingPlayer.id) {
		await interaction.reply({
			content: 'You cannot nominate yourself.',
			ephemeral: true,
		});
		return;
	}

	// Case for when player tries to nominate again
	if (nominatingPlayer.hasNominated) {
		await interaction.reply({
			content: 'You have already nominated a player.',
			ephemeral: true,
		});
		return;
	}

	const nominateEmbed = new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle('Please decide if you wish to second this nomination.')
		.setDescription(
			`${nominatingPlayerDiscord} has nominated ${accusedPlayerDiscord} to be hanged.`,
		);

	const nominateButtonRow =
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`nomination-${accusedPlayerDiscord.id}`)
				.setLabel('Nominate')
				.setStyle(ButtonStyle.Primary),
		);

	const rescindButtonRow =
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId('rescind')
				.setLabel('Rescind Nomination')
				.setStyle(ButtonStyle.Danger),
		);

	// send message to channel declaring nomination
	await channel.send(
		`${nominatingPlayerDiscord} has nominated ${accusedPlayerDiscord}.`,
	);

	// send embed w/ button
	const nominationMessage = await interaction.reply({
		embeds: [nominateEmbed],
		components: [nominateButtonRow],
		fetchReply: true,
	});
	game.nominationMessages.push(nominationMessage);

	nominatingPlayer.hasNominated = true;

	await interaction.followUp({
		components: [rescindButtonRow],
		ephemeral: true,
	});

	const filter = (i: { customId: string }) =>
		i.customId === `nomination-${accusedPlayerDiscord.id}` ||
		i.customId === 'rescind';

	const collector = interaction.channel.createMessageComponentCollector({
		filter,
	});

	collector.on('collect', async (i) => {
		if (i.customId === 'rescind') {
			await channel.send(
				`${nominatingPlayerDiscord} has rescinded their nomination for ${accusedPlayerDiscord}`,
			);
			await nominationMessage.delete();
			await interaction.followUp({
				content: 'Nomination rescinded.',
				ephemeral: true,
			});
			nominatingPlayer.hasNominated = false;
		} else if (i.customId === `nomination-${accusedPlayerDiscord.id}`) {
			const agreeingPlayer = game.players.find((p) => p.id === i.user.id);

			if (!agreeingPlayer) {
				await i.reply({
					content: 'You are not in this game!',
					ephemeral: true,
				});
				return;
			}

			if (!agreeingPlayer.isAlive) {
				await i.reply({
					content: 'Dead players cannot nominate!',
					ephemeral: true,
				});
				return;
			}

			if (agreeingPlayer.id === accusedPlayerDiscord.id) {
				await i.reply({
					content: 'You cannot agree to nominate for yourself!',
					ephemeral: true,
				});
				return;
			}

			if (agreeingPlayer.id === interaction.user.id) {
				await i.reply({
					content: 'You cannot vote for your own nomination!',
					ephemeral: true,
				});
				return;
			}

			game.accused = accusedPlayer;
			await channel.send(
				`${i.user} has agreed to nominate ${accusedPlayerDiscord}\nNow proceeding to ${accusedPlayerDiscord}'s defense`,
			);
			collector.stop();
			game.nominationMessages.forEach(async (m) => await m.delete());
			promptDefense(game);
		}
	});
};
