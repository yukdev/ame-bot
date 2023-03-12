const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nominate')
    .setDescription('Nominate a player to be lynched.')
    .addUserOption((option) =>
      option
        .setName('selected')
        .setDescription('The player to nominate')
        .setRequired(true),
    ),

  async execute(interaction) {
    const game = interaction.client.game;

    // no game in progress
    if (!game?.inProgress) {
      await interaction.reply({
        content: 'There is no game in progress.',
        ephemeral: true,
      });
      return;
    }

    const player = game.players.find((p) => p.id === interaction.user.id);
    const playerDiscord = interaction.user;
    const selected = interaction.options.getUser('selected');


    // player has already voted
    if (player.voted) {
      await interaction.reply({
        content: 'You have already voted.',
        ephemeral: true,
      });
      return;
    }

    // game not in nomination phase
    if (!game.inNomination) {
      await interaction.reply({
        content: 'You cannot nominate a player at this time.',
        ephemeral: true,
      });
      return;
    }

    // no player selected
    if (!selected) {
      await interaction.reply('Please select a player to nominate.');
      return;
    }

    // player selected not in the game
    if (!game.players.some((p) => p.id === selected.id)) {
      await interaction.reply({
        content: 'That player is not in this game.',
        ephemeral: true,
      });
      return;
    }

    // selecting yourself
    if (selected.id === interaction.user.id) {
      await interaction.reply({
        content: 'You can\'t nominate yourself.',
        ephemeral: true,
      });
      return;
    }

    const selectedPlayer = game.players.find((p) => p.id === selected.id);
    game.vote(player, selectedPlayer);
    await interaction.reply({
      content: `You have nominated ${selected}.`,
      ephemeral: true,
    });
    await interaction.channel.send({
      content: `${playerDiscord} has nominated ${selected} to be lynched.`,
    });
  },
};
