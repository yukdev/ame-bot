import { SlashCommandBuilder } from 'discord.js';

export const pingCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!');