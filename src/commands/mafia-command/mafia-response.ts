import { games } from '../../shared/globals';
import { Game } from '../../models/game';

const MINIMUM_PLAYER_COUNT = 4;

interface Player {
  name: string;
  id: string;
  interaction: ChatInputCommandInteraction | ButtonInteraction;
}

let players: Player[] = [];
let setupInProgress = false;

import { startGame } from '../../utils/gameLogic';

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
} from 'discord.js';

export const mafiaResponse = async (interaction: ChatInputCommandInteraction) => {
  const [channelId, guildId] = [interaction.channelId, interaction.guildId];

  if (setupInProgress) {
     await interaction.reply({
      content: 'A game is already being set up.',
      ephemeral: true,
    });
    return;
  }

  setupInProgress = true;

  players.push({
    name: interaction.user.username,
    id: interaction.user.id,
    interaction,
  });

  const joinLeaveButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('join')
      .setLabel('Join')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('leave')
      .setLabel('Leave')
      .setStyle(ButtonStyle.Danger),
  );

  const startCancelButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('start')
      .setLabel('Start')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger),
  );

  const joinLeaveEmbed = new EmbedBuilder()
    .setTitle(`${interaction.user.username} has started a game of Mafia!`)
    .setDescription(`__Current Players:__\n${interaction.user}`);

  // Send message with join/leave buttons
  const message = await interaction.reply({
    embeds: [joinLeaveEmbed],
    components: [joinLeaveButtonRow],
  });

  // Start/end to creator
  await interaction.followUp({
    components: [startCancelButtonRow],
    ephemeral: true,
  });

  const filter = (i) =>
    i.customId === 'join' ||
    i.customId === 'start' ||
    i.customId === 'cancel' ||
    i.customId === 'leave';

  const collector = message.createMessageComponentCollector({
    filter,
  });

  // add the players who clicked the button to the array
  collector.on('collect', async (i: ButtonInteraction) => {
    if (i.customId === 'join') {
      if (checkIfPlayerInGame(i)) {
        await i.reply({
          content: 'You have already joined the game!',
          ephemeral: true,
        });
      } else {
        players.push({
          name: i.user.username,
          id: i.user.id,
          interaction: i,
        });

        joinLeaveEmbed.setDescription(
          `__Current Players:__\n${players
            .map((p) => p.interaction.user)
            .join(', ')}`,
        );

        const reply = await interaction.fetchReply();
        await reply.edit({ embeds: [joinLeaveEmbed] });
        i.deferUpdate();
      }
    } else if (i.customId === 'leave') {
      if (checkIfPlayerInGame(i)) {
        players = players.filter((p) => p.id !== i.user.id);
        joinLeaveEmbed.setDescription(
          `__Current Players:__\n${players
            .map((p) => p.interaction.user)
            .join(', ')}`,
        );

        const reply = await interaction.fetchReply();
        await reply.edit({ embeds: [joinLeaveEmbed] });
        i.deferUpdate();
      } else {
        await i.reply({
          content: 'You are not in the game!',
          ephemeral: true,
        });
      }
    } else if (i.customId === 'start') {
      if (players.length >= MINIMUM_PLAYER_COUNT) {
        await i.reply({
          content: 'Starting the game with ' + players.length + ' players!',
          ephemeral: true,
        });

        const gameId = `${channelId}-${guildId}`;
        if (games[gameId]) {
          // game is already in progress
        } else {
          const game = new Game(interaction, gameId);
          games[gameId] = game;
          startGame();
        }

        const reply = await interaction.fetchReply();
        await reply.delete();

        collector.stop();
      } else {
        await i.reply({
          content: `You need at least ${MINIMUM_PLAYER_COUNT} players to start the game!`,
          ephemeral: true,
        });
      }
    } else if (i.customId === 'cancel') {
      setupInProgress = false;

      const reply = await interaction.fetchReply();
      await reply.delete();
      i.deferUpdate();

      collector.stop();
      players = [];
    }
  });
};

function checkIfPlayerInGame(clicker: ButtonInteraction) {
  return players.some((p) => p.id === clicker.user.id);
}
