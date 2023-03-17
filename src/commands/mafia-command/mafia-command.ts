import { SlashCommandBuilder } from 'discord.js';

export const mafiaCommand = new SlashCommandBuilder()
  .setName('mafia')
  .setDescription('Starts a game of Mafia!');