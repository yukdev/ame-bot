const MINIMUM_PLAYERS = 4;

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
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('join')
        .setLabel('Join Mafia Game')
        .setStyle(ButtonStyle.Success),
    );

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`${interaction.user.username} has started a game of Mafia!`)
      .setDescription('Click the button to join!');

    const message = await interaction.reply({
      embeds: [embed],
      components: [row],
    });

    const filter = (i) =>
      i.customId === 'join' && i.user.id !== interaction.user.id;
    const collector = message.createMessageComponentCollector({
      filter,
      time: 5000,
    });

    // Create an array of player objects for the game
    // add the creator of the game to the array
    const players = [
      { name: interaction.user.username, id: interaction.user.id, interaction },
    ];
    // add the players who clicked the button to the array
    collector.on('collect', async (i) => {
      // grab user of person who clicks
      const playerName = i.user.username;
      if (players.some((p) => p.id === i.user.id)) {
        await i.reply({
          content: 'You have already joined the game!',
          ephemeral: true,
        });
      } else {
        players.push({ name: i.user.username, id: i.user.id, interaction: i });
        await i.reply({
          content: 'You have joined the game!',
          ephemeral: true,
        });
        await interaction.channel.send({
          content: `${playerName} has joined the game!`,
        });
      }
    });

    // Start the game once the time runs out or all players have joined
    collector.on('end', async () => {
      const numPlayers = players.length;
      if (numPlayers < MINIMUM_PLAYERS) {
        await interaction.followUp('Not enough players to start the game.');
      } else {
        await interaction.followUp(
          'Starting the game with ' + numPlayers + ' players!',
        );
        startGame(interaction, players);
      }
    });
  },
};
