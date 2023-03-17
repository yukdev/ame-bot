import { SlashCommandBuilder } from 'discord.js';

export const timeCommand = new SlashCommandBuilder()
  .setName('time')
  .setDescription('Responds with the remaining time left in the day.');