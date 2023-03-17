const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const { promptDefense } = require('../utils/gameLogic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nominate')
    .setDescription('Nominate a player to be hanged.')
    .addUserOption((option) =>
      option
        .setName('selected')
        .setDescription('The player to nominate')
        .setRequired(true),
    ),

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

    // Case for when user not in game tries to nominate
    if (!game.players.some((p) => p.id === interaction.user.id)) {
      await interaction.reply({
        content: 'You are not in this game!',
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
    const accusedPlayerDiscord = interaction.options.getUser('selected');
    const accusedPlayer = game.players.find(
      (p) => p.id === accusedPlayerDiscord.id,
    );

    // Case for when selected player is not in game
    if (!game.players.some((p) => p.id === accusedPlayerDiscord.id)) {
      await interaction.reply({
        content: 'That player is not in this game.',
        ephemeral: true,
      });
      return;
    }

    // Case for dead player trying to nominate
    if (nominatingPlayer.dead) {
      await interaction.reply({
        content: 'Dead players cannot nominate!',
        ephemeral: true,
      });
      return;
    }

    // Case for nominating dead player
    if (accusedPlayer.dead) {
      await interaction.reply({
        content: 'You cannot nominate a dead player!',
        ephemeral: true,
      });
      return;
    }

    // Case for when no player is selected
    if (!accusedPlayerDiscord) {
      await interaction.reply('Please select a player to nominate.');
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
    if (nominatingPlayer.nominated) {
      await interaction.reply({
        content: 'You have already nominated a player.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Please decide if you wish to second this nomination.')
      .setDescription(
        `${nominatingPlayerDiscord} has nominated ${accusedPlayerDiscord} to be hanged.`,
      );

    const nominateButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`nomination-${accusedPlayerDiscord.id}`)
        .setLabel('Nominate')
        .setStyle(ButtonStyle.Primary),
    );

    const rescindButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rescind')
        .setLabel('Rescind Nomination')
        .setStyle(ButtonStyle.Danger),
    );

    nominatingPlayer.nominated = true;

    // send message to channel declaring nomination
    await interaction.channel.send(
      `${nominatingPlayerDiscord} has nominated ${accusedPlayerDiscord}.`,
    );

    // send embed w/ button
    const nominationMessage = await interaction.reply({
      embeds: [embed],
      components: [nominateButton],
      fetchReply: true,
    });
    game.nominationMessages.push(nominationMessage);

    await interaction.followUp({
      components: [rescindButton],
      ephemeral: true,
    });

    const filter = (i) =>
      i.customId === `nomination-${accusedPlayerDiscord.id}` ||
      i.customId === 'rescind';

    const collector = interaction.channel.createMessageComponentCollector({
      filter,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'rescind') {
        await interaction.channel.send(
          `${nominatingPlayerDiscord} has rescinded their nomination for ${accusedPlayerDiscord}`,
        );
        await nominationMessage.delete();
        await interaction.followUp({
          content: 'Nomination rescinded.',
          ephemeral: true,
        });
        nominatingPlayer.nominated = false;
      } else if (i.customId === `nomination-${accusedPlayerDiscord.id}`) {
        const agreeingPlayer = game.players.find((p) => p.id === i.user.id);

        if (!agreeingPlayer) {
          await i.editReply({
            content: 'You are not in this game!',
            ephemeral: true,
          });
          return;
        }

        if (agreeingPlayer.dead) {
          await i.editReply({
            content: 'Dead players cannot nominate!',
            ephemeral: true,
          });
          return;
        }

        if (agreeingPlayer.id === accusedPlayerDiscord.id) {
          await i.editReply({
            content: 'You cannot agree to nominate for yourself!',
            ephemeral: true,
          });
          return;
        }

        if (agreeingPlayer.id === interaction.user.id) {
          await i.editReply({
            content: 'You cannot vote for your own nomination!',
            ephemeral: true,
          });
          return;
        }

        game.accused = accusedPlayer;
        await interaction.channel.send(
          `${i.user} has agreed to nominate ${accusedPlayerDiscord}\nNow proceeding to ${accusedPlayerDiscord}'s defense`,
        );
        collector.stop();
        game.nominationMessages.forEach(async (m) => await m.delete());
        promptDefense();
      }
    });
  },
};
