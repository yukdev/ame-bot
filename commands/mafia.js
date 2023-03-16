const MINIMUM_PLAYER_COUNT = 4;

let players = [];
let setupInProgress = false;

const { startGame } = require('../utils/gameLogic');

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mafia')
    .setDescription('Starts a game of Mafia!'),
  async execute(interaction) {
    if (setupInProgress) {
      await interaction.reply({
        content: 'A game is already being set up.',
        ephemeral: true,
      });
      return;
    }

    setupInProgress = true;

    const joinLeaveMessage = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('join')
        .setLabel('Join')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('leave')
        .setLabel('Leave')
        .setStyle(ButtonStyle.Danger),
    );

    const startCancelMessage = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('start')
        .setLabel('Start')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger),
    );

    // Initialize players array, add creator to it
    players.push({
      name: interaction.user.username,
      id: interaction.user.id,
      interaction,
    });

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`${interaction.user.username} has started a game of Mafia!`)
      .setDescription(`__Current Players:__\n${interaction.user}`);

    // Send message with join/leave buttons
    const message = await interaction.reply({
      embeds: [embed],
      components: [joinLeaveMessage],
    });

    // Start/end to creator
    await interaction.followUp({
      components: [startCancelMessage],
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
    collector.on('collect', async (i) => {
      if (checkIfPlayerInGame(i) && i.customId === 'join') {
        await i.reply({
          content: 'You have already joined the game!',
          ephemeral: true,
        });
      } else if (i.customId === 'join') {
        players.push({ name: i.user.username, id: i.user.id, interaction: i });
        // Update the embed description with the new player
        embed.setDescription(
          `__Current Players:__\n${players
            .map((p) => p.interaction.user)
            .join(', ')}`,
        );
        const reply = await interaction.fetchReply();
        await reply.edit({ embeds: [embed] });
        // defer the update to prevent "interaction failed" error
        i.deferUpdate();
      } else if (i.customId === 'leave' && checkIfPlayerInGame(i)) {
        // Remove the player from the array
        players = players.filter((p) => p.id !== i.user.id);
        // Update the embed description with the new player
        embed.setDescription(
          `__Current Players:__\n${players
            .map((p) => p.interaction.user)
            .join(', ')}`,
        );
        const reply = await interaction.fetchReply();
        await reply.edit({ embeds: [embed] });
        // defer the update to prevent "interaction failed" error
        i.deferUpdate();
      } else if (i.customId === 'leave' && !checkIfPlayerInGame(i)) {
        await i.reply({
          content: 'You are not in the game!',
          ephemeral: true,
        });
      } else if (
        i.customId === 'start' &&
        players.length >= MINIMUM_PLAYER_COUNT
      ) {
        await i.reply({
          content: 'Starting the game with ' + players.length + ' players!',
          ephemeral: true,
        });
        startGame(interaction, players);

        // Delete the bot's message after the game starts
        const reply = await interaction.fetchReply();
        await reply.delete();

        collector.stop();
      } else if (
        i.customId === 'start' &&
        players.length < MINIMUM_PLAYER_COUNT
      ) {
        await i.reply({
          content: `You need at least ${MINIMUM_PLAYER_COUNT} players to start the game!`,
          ephemeral: true,
        });
      } else if (i.customId === 'cancel') {
        setupInProgress = false;
        // Delete the bot's message and stop the collector
        const reply = await interaction.fetchReply();
        await reply.delete();
        collector.stop();
        // acknowledge the cancel silently
        i.deferUpdate();
        players = [];
      }
    });
  },
};

function checkIfPlayerInGame(clicker) {
  return players.some((p) => p.id === clicker.user.id);
}
