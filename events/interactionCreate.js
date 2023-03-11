const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
} = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    if (interaction.commandName === 'button') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('primary')
          .setLabel('Primary')
          .setStyle(ButtonStyle.PRIMARY),
      );

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Some title')
        .setURL('https://discord.js.org')
        .setDescription('Some description here');

      await interaction.reply({
        content: 'I think you should',
        ephemeral: true,
        embeds: [embed],
        components: [row],
      });
    } else {
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}`);
        console.error(error);
      }
    }
  },
};
