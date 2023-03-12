let players = [];
const MINIMUM_PLAYER_COUNT = 4;

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
    const joinMessage = new ActionRowBuilder();

    // FIXME: this isn't working - everyone can see and use every button
    // Add a "Join Mafia Game" button for everyone
    joinMessage.addComponents(
      new ButtonBuilder()
        .setCustomId('join')
        .setLabel('Join')
        .setStyle(ButtonStyle.Success),
    );

    // Add a "Start Game" button that is only visible to the creator
    const startCancelMessage = new ActionRowBuilder();
    startCancelMessage.addComponents(
      new ButtonBuilder()
        .setCustomId('start')
        .setLabel('Start')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger),
    );

    // TODO: move start/end to ephemeral msg to creator
    // TODO: add ephemeral msg to people who join with option to leave

    // Initialize players array, add creator to it
    players.push({
      name: interaction.user.username,
      id: interaction.user.id,
      interaction,
    });

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`${interaction.user.username} has started a game of Mafia!`)
      .setDescription(`Players: ${players.map((p) => p.interaction.user)}`);

    // Join to everyone else
    const message = await interaction.reply({
      embeds: [embed],
      components: [joinMessage],
    });

    // Start/end to creator
    await interaction.followUp({
      components: [startCancelMessage],
      ephemeral: true,
    });

    const filter = (i) =>
      i.customId === 'join' ||
      i.customId === 'start' ||
      i.customId === 'cancel';
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
            .join(', ')}.`,
        );
        const reply = await interaction.fetchReply();
        await reply.edit({ embeds: [embed] });
        // defer the update to prevent "interaction failed" error
        i.deferUpdate();
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
      } else if (
        i.customId === 'cancel' &&
        interaction.user.id === interaction.member.user.id
      ) {
        // Delete the bot's message and stop the collector
        const reply = await interaction.fetchReply();
        await reply.delete();
        collector.stop();
        players = [];
      }
    });
  },
};

function checkIfPlayerInGame(clicker) {
  return players.some((p) => p.id === clicker.user.id);
}
