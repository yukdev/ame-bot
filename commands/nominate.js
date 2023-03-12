const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} = require('discord.js');

const { promptDefense } = require('../utils/gameLogic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nominate')
    .setDescription('Nominate a player to be lynched.')
    .addUserOption((option) =>
      option
        .setName('target')
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

    const nominator = game.players.find((p) => p.id === interaction.user.id);
    const nominatorDiscord = interaction.user;
    const selected = interaction.options.getUser('target');

    // cannot nominate if game is not in nomination phase
    if (!game.inNomination) {
      await interaction.reply({
        content: 'You cannot nominate a player at this time.',
        ephemeral: true,
      });
      return;
    }

    // cannot select player not in game
    if (!game.players.some((p) => p.id === selected.id)) {
      await interaction.reply({
        content: 'That player is not in this game.',
        ephemeral: true,
      });
      return;
    }

    // cannot select yourself
    if (selected.id === interaction.user.id) {
      await interaction.reply({
        content: "You can't nominate yourself.",
        ephemeral: true,
      });
      return;
    }

    const selectedPlayer = game.players.find((p) => p.id === selected.id);
    const selectedPlayerDiscord = interaction.client.users.cache.get(
      selectedPlayer.id,
    );
    game.vote(nominator, selectedPlayer);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Please decide if you would like to nominate this player')
      .setDescription(
        `${nominatorDiscord} has nominated ${selectedPlayerDiscord} to be lynched.`,
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`nomination-${selected.id}`)
        .setLabel('Nominate')
        .setStyle('Primary')
        .setEmoji('👍'),
    );

    const message = await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    // Set a timeout for the button to expire after 30 seconds
    setTimeout(async () => {
      row.components[0].setDisabled(true);
      row.components[0].setEmoji('🕒');
      await message.edit({ components: [row] });
    }, 30000);

    // Check if the button click is from the person who nominated or not
    const filter = (i) => {
      return (
        i.customId === `nomination-${selected.id}` &&
        i.user.id !== nominatorDiscord.id
      );
    };

    // Handle button click
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 30000,
      max: 1,
    });

    collector.on('collect', async (i) => {
      // send message to channel saying who agreed
      await interaction.channel.send(
        `${i.user} has agreed to nominate ${selectedPlayerDiscord}\nNow proceeding to ${selectedPlayerDiscord}'s defense`,
      );
      // Delete the bot's message and stop the collector
      const reply = await interaction.fetchReply();
      await reply.delete();
      collector.stop();
      promptDefense();
    });

    collector.on('end', async (collected) => {
      // If no one agreed to nominate, send message to channel
      if (collected.size === 0) {
        await interaction.channel.send(
          `No one agreed to nominate ${selectedPlayerDiscord}`,
        );
        // Delete the bot's message and stop the collector
        const reply = await interaction.fetchReply();
        await reply.delete();
        collector.stop();
      }
    });

    // acknowledge nomination silently
    await interaction.deferUpdate();
  },
};
