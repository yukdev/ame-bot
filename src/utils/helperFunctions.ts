import { ThreadChannel, TextChannel, ChannelType } from 'discord.js';
import type {
	GuildTextThreadCreateOptions,
	AllowedThreadTypeForTextChannel,
} from 'discord.js';
import type { Player } from '../models/player';
import type { Game } from '../models/game';
import type {
	mafiaInteractions,
	copInteractions,
	medicInteractions,
} from './gameLogic';

type userInteraction =
	| typeof mafiaInteractions
	| typeof copInteractions
	| typeof medicInteractions;

// get discord user from id
export function getDiscordUserFromId(id: string, game: Game) {
	return game.interaction.client.users.cache.get(id);
}

// shuffle an array
export function shuffle(array: any[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

// get role for a player
export function getRole(player: Player) {
	return player.role;
}

// determine how many of each role based on number of players
export function getNumberOfMafia(numPlayers: number) {
	switch (numPlayers) {
		// if 4-5 players: 1 mafia
		case 4 || 5:
			return 1;
		// if 6-8 players: 2 mafia
		case 6 || 7 || 8:
			return 2;
		// if 9-12 players, 3 mafia
		case 9 || 10 || 11 || 12:
			return 3;
		default:
			return 0;
	}
}

export function endGame(winner: string, game: Game) {
	const gameChannel = game.interaction.channel;

	if (gameChannel) {
		if (winner === 'mafia') {
			gameChannel.send('The mafia has won!');
		} else {
			gameChannel.send('The townies have won!');
		}
	}
}

export async function createPrivateThread(
	name: string,
	interactions: userInteraction,
	channel: TextChannel,
): Promise<ThreadChannel> {
	const options: GuildTextThreadCreateOptions<AllowedThreadTypeForTextChannel> =
		{
			name,
			autoArchiveDuration: 60,
			reason: 'Private thread for Mafia game discussion',
			type: ChannelType.PrivateThread,
			invitable: true,
		};

	const thread = await channel.threads.create(options);

	// lock the thread initially
	await thread.setLocked(true);

	// invite the members to the thread
	await Promise.all(
		interactions.map(async (interaction) => {
			try {
				await thread.members.add(interaction.user);
			} catch (err) {
				console.error(
					`Failed to add member ${interaction.user} to the thread: ${err}`,
				);
			}
		}),
	);

	return thread;
}
