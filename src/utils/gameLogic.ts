import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	ChatInputCommandInteraction,
	ButtonInteraction,
} from 'discord.js';
import type { User } from 'discord.js';
import type { DiscordPlayer } from '../commands/mafia-command/mafia-response';
import type { Game } from '../models/game';
import type { Player } from '../models/player';
import { Mafia, Townie, Cop, Medic } from '../models/player';
import {
	shuffle,
	getNumberOfMafia,
	endGame,
	createPrivateThread,
	getDiscordUserFromId,
} from '../utils/helperFunctions';

type interaction = ChatInputCommandInteraction | ButtonInteraction;
type Role = typeof Mafia | typeof Townie | typeof Cop | typeof Medic;

const displayPlayers: DiscordPlayer[] = [];
const mafia: Player[] = [];
const townies: Player[] = [];
// let cop: Player | undefined;
// let medic: Player | undefined;
const mafiaInteractions: interaction[] = [];
const copInteractions: interaction[] = [];
const medicInteractions: interaction[] = [];
// let mafiaThread;
// let copThread;
// let medicThread;

/* ------------------------------- Game Start ------------------------------- */

export async function startGame(game: Game, players: DiscordPlayer[]) {
	// add players to game
	players.forEach((user) => {
		displayPlayers.push(user);
	});

	// set game to start
	game.inProgress = true;

	// send message to channel
	await game.channel.send(
		'**The game has started.**\nRead your ping carefully for your role and/or powers.',
	);

	setupGame(game, players);
}

async function setupGame(game: Game, players: DiscordPlayer[]) {
	// shuffle players
	shuffle(players);
	// FIXME: make game more fair to mafia later
	const mafiaCount = getNumberOfMafia(players.length);

	for (let i = 0; i < players.length; i++) {
		const player = players[i];

		if (i < mafiaCount) {
			await assignRole(player!, Mafia, i, game);
		} else if (i === game.players.length - 1) {
			await assignRole(player!, Medic, i, game);
		} else if (i === game.players.length - 2) {
			await assignRole(player!, Cop, i, game);
		} else {
			await assignRole(player!, Townie, i, game);
		}
	}

	// send an ephemeral reply to each mafia member telling them who their fellow mafia mates are
	const mafiaMatesUsers: User[] = [];
	mafia.forEach((p) => {
		const discordUser = getDiscordUserFromId(p.id, game);
		if (discordUser) {
			mafiaMatesUsers.push(discordUser);
		}
	});

	mafiaInteractions.forEach(async (interaction) => {
		await interaction.followUp({
			content:
				mafiaMatesUsers.length > 1
					? `Your fellow mafia mates are:\n${mafiaMatesUsers
							.filter((m) => m.id !== interaction.user.id)
							.map((m) => m.toString())
							.join(' ')}`
					: 'You are the only mafia member.',
			ephemeral: true,
		});
	});

	// create a new private thread for the mafia players
	const mafiaThreadTopic = 'Private thread for the Mafia';
	await createPrivateThread(
		'Mafia Private Thread',
		mafiaInteractions,
		mafiaThreadTopic,
		game,
	);

	// create a new private thread for the cop
	const copThreadTopic = 'Private thread for the Cop.';
	await createPrivateThread(
		'Cop Private Thread',
		copInteractions,
		copThreadTopic,
		game,
	);

	// create a new private thread for the medic
	const medicThreadTopic = 'Private thread for the Medic.';
	await createPrivateThread(
		'Medic Private Thread',
		medicInteractions,
		medicThreadTopic,
		game,
	);

	setTimeout(() => {
		startDay(game, []);
	}, 1000 * 1);
}

/* -------------------------------- Day Start ------------------------------- */

async function startDay(game: Game, killed: Player[]) {
	// increment day
	// set time to day
	// reset day timer
	// clear votes from game & players
	game.setupNewDay();
	// check if game is over
	if (game.checkForWin()) {
		endGame(game.winner!, game);
	}

	// declare it is day
	await game.channel.send(`It is now day ${game.day}.`);

	// if there were kill(s) last night, send message to channel
	// TODO: refactor this later to mention the killed users
	if (killed && killed.length > 0) {
		const numKilled = killed.length;

		await game.channel.send(`There were ${numKilled} kill(s) last night.`);
	}

	// tell players to discuss
	await game.channel.send(
		'You have 5 minutes to discuss who you think is suspicious.\nYou can nominate a player to make a defense with /nominate',
	);

	game.state = 'nomination';
	// start day timer of 5 minutes
	game.startDayTimer(startNight);
}

export async function promptDefense(game: Game) {
	game.state = 'defense';

	await game.channel.send('You have 2 minutes to make your defense.');

	setTimeout(() => {
		startHangingVote(game);
	}, 1000 * 5);

	// setTimeout(() => {
	//   startHangingVote();
	// }, 1000 * 60 * 2);
}

async function startHangingVote(game: Game) {
	// set game to hanging phase
	game.state = 'hanging';

	// get voted player
	const accusedPlayer = game.accused!;
	const accusedPlayerDiscord = getDiscordUserFromId(accusedPlayer.id, game);

	// clear votes
	game.clearVotes();

	await game.channel.send(
		`Please vote if you would like to hang ${accusedPlayerDiscord}`,
	);

	const yesNoButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('yes')
			.setLabel('Yes')
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId('no')
			.setLabel('No')
			.setStyle(ButtonStyle.Danger),
	);

	const yesNoEmbed = new EmbedBuilder()
		.setTitle(
			'You have 15 seconds to vote.\nIf you do not vote, you will be considered abstaining.',
		)
		.setDescription(
			`Please vote if you would like to hang ${accusedPlayerDiscord}`,
		);

	const message = await game.channel.send({
		embeds: [yesNoEmbed],
		components: [yesNoButtonRow],
	});

	// TODO: is this type correct for i?
	const filter = (i: { customId: string }) =>
		i.customId === 'yes' || i.customId === 'no';

	// 15 seconds to vote
	const collector = message.createMessageComponentCollector({
		filter,
		time: 15 * 1000,
		// time: 120000,
	});

	collector.on('collect', async (i) => {
		const votingPlayer = game.players.find((p) => p.id === i.user.id);

		if (!votingPlayer) {
			await i.reply({
				content: 'You are not in the game.',
				ephemeral: true,
			});
			return;
		}

		// Case for if player has already voted
		if (votingPlayer.hasVoted) {
			await i.reply({
				content: 'You have already voted.',
				ephemeral: true,
			});
			return;
		}

		// Case for if voting player is dead
		if (!votingPlayer.isAlive) {
			await i.reply({
				content: 'Dead players cannot vote!',
				ephemeral: true,
			});
			return;
		}

		// Case for if voting player is the accused
		if (votingPlayer.id === accusedPlayer.id) {
			await i.reply({
				content: 'The accused cannot vote!',
				ephemeral: true,
			});
		}

		if (i.customId === 'yes') {
			game.vote(votingPlayer, accusedPlayer);
			await i.reply({
				content: `You have voted to hang ${accusedPlayerDiscord}`,
				ephemeral: true,
			});
		} else {
			await i.reply({
				content: `You have voted against hanging ${accusedPlayerDiscord}`,
				ephemeral: true,
			});
		}
	});

	collector.on('end', async () => {
		game.clearVotes();

		const hangAccused = game.determineHanging();

		if (hangAccused) {
			accusedPlayer.kill();
			await game.channel.send(`${accusedPlayerDiscord} has been hanged.`);
			// FIXME:
			// check if game is over
			// if (game.checkForWin()) {
			//   endGame(game.checkForWin());
			// }
			await game.channel.send('Now proceeding to night time.');
			// clear the interval since we are proceeding to night
			startNight();
		} else {
			// send message to channel saying there was no majority vote
			await game.channel.send(
				`There was no majority vote.\nPlease continue to discuss and nominate players.\n${game.getTimeLeft()}.`,
			);
			game.state = 'nomination';
		}
	});
}

/* ------------------------------- Night Start ------------------------------ */

function startNight() {
	console.log('it is now night');
	return;
	// // set cycle to night
	// game.cycle = 'night';

	// // unlock mafia thread to let them discuss
	// await mafiaThread.setLocked(false);
	// await copThread.setLocked(false);
	// await medicThread.setLocked(false);

	// let [mafiaDone, copDone, medicDone] = [false, false, false];
	// const killed = [];

	// // grab mafia members
	// const mafia = game.players.filter((p) => p.role === 'mafia');
	// // create a private thread for the mafia members
	// // send message to that thread
	// // FIXME, use discord bot option selection
	// game.message.channel.send(`
	// Mafia, it is now night.
	// Please discuss amongst yourself who to kill.
	// When you have decided on a target, please choose them from the options.`);
	// // FIXME: set chosen player to variable
	// const chosenPlayer = new Player();
	// // Send confirmation message after mafia has chosen a player
	// game.message.channel.send(`
	// Your target has been confirmed.
	// Please wait for the other roles to make their decisions.`);
	// // somehow check if they made their decision
	// // mafiaDone = true;

	// // check to see if cop is alive
	// if (game.players.some((p) => p.role === 'cop')) {
	//   // create a private thread for the cop
	//   // send message to that thread
	//   game.message.channel.send(`
	//   Cop, it is now night.
	//   Please choose a player to investigate.`);
	//   // after cop has chosen a player, send message to channel
	//   const cop = game.players.find((p) => p.role === 'cop');
	//   game.message.channel.send(`${cop.checkedPlayer} is ${cop.investgate()}.`);
	//   // somehow check if they made their decision
	//   // copDone = true;
	// }

	// // check to see if medic is alive
	// if (game.players.some((p) => p.role === 'medic')) {
	//   // create a private thread for the medic
	//   // send message to that thread
	//   game.message.channel.send(`
	//   Medic, it is now night.
	//   Please choose a player to save.`);
	//   // after medic has chosen a player, send message to channel
	//   const medic = game.players.find((p) => p.role === 'medic');
	//   game.message.channel.send(
	//     `${medic.savedPlayer} is safe from being killed tonight.`,
	//   );
	//   // somehow check if they made their decision
	//   // medicDone = true;
	// }
	// // consideration for if medic and/or cop are dead.
	// // set a timer for a variable amount of time so people can't metagame.

	// if (mafiaDone && copDone && medicDone) {
	//   // determine if the person mafia shot is dead
	//   const medic = game.players.find((p) => p.role === 'medic');
	//   if (medic.savedPlayer !== chosenPlayer) {
	//     killed.push(chosenPlayer);
	//     chosenPlayer.kill();
	//   }
	//   // start day
	//   startDay(killed);
	// }
}

async function assignRole(
	player: DiscordPlayer,
	role: Role,
	index: number,
	game: Game,
) {
	// TODO: check if this works later
	const nickname = game.guild.members.cache.get(player.id)!.nickname;

	let newPlayer: Mafia | Cop | Medic | Townie | undefined;

	if (role === Mafia) {
		newPlayer = new Mafia(nickname!, player.id);
		mafia.push(newPlayer);
		mafiaInteractions.push(player.interaction);
	} else if (role === Cop) {
		newPlayer = new Cop(nickname!, player.id);
		// cop = newPlayer;
		copInteractions.push(player.interaction);
	} else if (role === Medic) {
		newPlayer = new Medic(nickname!, player.id);
		// medic = newPlayer;
		medicInteractions.push(player.interaction);
	} else {
		newPlayer = new Townie(nickname!, player.id);
		townies.push(newPlayer);
	}

	let description = newPlayer.description;

	if (newPlayer instanceof Cop || newPlayer instanceof Medic) {
		description += newPlayer.roleExplanation;
	}

	await player.interaction.followUp({
		content: description,
		ephemeral: true,
	});

	game.players[index] = newPlayer;
}
