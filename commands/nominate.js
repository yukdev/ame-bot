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

    // game not in nomination phase
    if (!game.inNomination) {
      await interaction.reply({
        content: 'You cannot nominate a player at this time.',
        ephemeral: true,
      });
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

    // no player selected
    if (!selected) {
      await interaction.reply('Please select a player to nominate.');
      return;
    }

    // selecting yourself
    if (selected.id === interaction.user.id) {
      await interaction.reply({
        content: 'You cannot nominate yourself.',
        ephemeral: true,
      });
      return;
    }

    const selectedPlayer = game.players.find((p) => p.id === selected.id);
    game.vote(player, selectedPlayer);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Please decide if you would like to nominate this player')
      .setDescription(
        `${playerDiscord} has nominated ${selected} to be lynched.`,
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`nomination-${selected.id}`)
        .setLabel('Nominate')
        .setStyle('Primary'),
    );

    // ack interaction
    await interaction.reply({
      content: `You have successfully nominated ${selected}`,
      ephemeral: true,
    });

    // send embed w/ button
    const message = await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    // Check if the button click is from the person who nominated or not
    const filter = (i) => {
      return i.customId === `nomination-${selected.id}`;
    };

    // Handle button click
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 30000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id === selected.id) {
        await i.reply({
          content: 'You cannot agree to nominate for yourself!',
          ephemeral: true,
        });
      } else if (i.user.id === interaction.user.id) {
        await i.reply({
          content: 'You cannot vote for your own nomination!',
          ephemeral: true,
        });
      } else {
        // send message to channel saying who agreed
        await interaction.channel.send(
          `${i.user} has agreed to nominate ${selected}\nNow proceeding to ${selected}'s defense`,
        );
        await message.delete();
        collector.stop();
        promptDefense();
      }
    });

    collector.on('end', async (collected) => {
      // If no one agreed to nominate, send message to channel
      if (collected.size === 0) {
        await interaction.channel.send(`No one agreed to nominate ${selected}`);
        await message.delete();
        collector.stop();
      }
    });
  },
};
