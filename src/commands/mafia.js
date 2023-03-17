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
    // If a game is already being set up, respond to the user and return
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

          embed.setDescription(
            `__Current Players:__\n${players
              .map((p) => p.interaction.user)
              .join(', ')}`,
          );

          const reply = await interaction.fetchReply();
          await reply.edit({ embeds: [embed] });
          i.deferUpdate();
        }
      } else if (i.customId === 'leave') {
        if (checkIfPlayerInGame(i)) {
          players = players.filter((p) => p.id !== i.user.id);
          embed.setDescription(
            `__Current Players:__\n${players
              .map((p) => p.interaction.user)
              .join(', ')}`,
          );

          const reply = await interaction.fetchReply();
          await reply.edit({ embeds: [embed] });
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
          startGame(interaction, players);

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
  },
};

function checkIfPlayerInGame(clicker) {
  return players.some((p) => p.id === clicker.user.id);
}
