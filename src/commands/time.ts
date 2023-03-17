const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('time')
    .setDescription('Responds with the remaining time left in the day.'),

  async execute(interaction) {
    const game = interaction.client.game;
    // Case for when no game in progress
    if (!game?.inProgress) {
      await interaction.reply({
        content: 'There is no game in progress.',
        ephemeral: true,
      });
      return;
    }

    // Case for when it is not day
    if (game.cycle !== 'day') {
      await interaction.reply({
        content: 'It is not daytime!',
        ephemeral: true,
      });
      return;
    }
    // have the bot send the current time to the channel
    await interaction.reply(game.getTimeLeft());
  },
};
