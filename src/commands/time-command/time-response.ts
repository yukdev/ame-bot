import type { ChatInputCommandInteraction, Client } from 'discord.js';
import type { Game } from '../../models/game';

export const timeResponse = async (interaction: ChatInputCommandInteraction) => {
  const client = interaction.client as Client & { game: Game };
    const game = client.game;
    // Case for when no game in progress
    if (!game?.inProgress) {
      return interaction.reply({
        content: 'There is no game in progress.',
        ephemeral: true,
      });
    }

    // Case for when it is not day
    if (game.cycle !== 'day') {
      return interaction.reply({
        content: 'It is not daytime!',
        ephemeral: true,
      });
    }

    return interaction.reply(game.getTimeLeft());
  };