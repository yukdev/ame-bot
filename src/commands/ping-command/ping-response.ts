import type { ChatInputCommandInteraction } from 'discord.js';

export const pingResponse = async (interaction: ChatInputCommandInteraction) => {
  const message = await interaction.deferReply({ fetchReply: true });
  const newMessage = `API Latency: ${
    interaction.client.ws.ping
  }\nClient Ping: ${message.createdTimestamp - interaction.createdTimestamp}`;

  return interaction.editReply({
    content: newMessage,
  });
}