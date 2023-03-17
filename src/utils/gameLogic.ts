import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from 'discord.js';
import { Mafia, Townie, Cop, Medic } from '../models/player';
import { games } from '../shared/globals';
import { shuffle, getNumberOfMafia, endGame, createPrivateThread } from '../utils/helperFunctions';

let game;

const mafia = [];
const townies = [];
let cop;
let medic;
const mafiaInteractions = [];
const copInteractions = [];
const medicInteractions = [];
let mafiaThread;
let copThread;
let medicThread;

/* ------------------------------- Game Start ------------------------------- */

async function startGame(interaction, players) {
  const { channelId, guildId } = interaction;
  const gameId = `${channelId}-${guildId}`;
  game = games[gameId];

  // add players to game
  players.forEach((user) => {
    game.addPlayer(user);
  });

  // set game to start
  game.inProgress = true;

  // add game to client
  interaction.client.game = game;

  // send message to channel
  await interaction.channel.send(
    '**The game has started.**\nRead your ping carefully for your role and/or powers.',
  );

  setupGame();
}

async function setupGame() {
  // shuffle players
  shuffle(game.players);
  // FIXME: make game more fair to mafia later
  const mafiaCount = getNumberOfMafia(game.players.length);

  for (let i = 0; i < game.players.length; i++) {
    const player = game.players[i];

    if (i < mafiaCount) {
      await assignRole(player, Mafia, i);
    } else if (i === game.players.length - 1) {
      await assignRole(player, Medic, i);
    } else if (i === game.players.length - 2) {
      await assignRole(player, Cop, i);
    } else {
      await assignRole(player, Townie, i);
    }
  }

  // send an ephemeral reply to each mafia member telling them who their fellow mafia mates are
  const mafiaMatesUsers = mafia.map((p) =>
    game.interaction.client.users.cache.get(p.id),
  );
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
  mafiaThread = await createPrivateThread(
    'Mafia Private Thread',
    mafiaInteractions,
    mafiaThreadTopic,
    game,
  );

  // create a new private thread for the cop
  const copThreadTopic = 'Private thread for the Cop.';
  copThread = await createPrivateThread(
    'Cop Private Thread',
    copInteractions,
    copThreadTopic,
    game,
  );

  // create a new private thread for the medic
  const medicThreadTopic = 'Private thread for the Medic.';
  medicThread = await createPrivateThread(
    'Medic Private Thread',
    medicInteractions,
    medicThreadTopic,
    game,
  );

  setTimeout(() => {
    startDay();
  }, 1000 * 1);
}

/* -------------------------------- Day Start ------------------------------- */

function startDay(killed) {
  // increment day
  // set time to day
  // reset day timer
  // clear votes from game & players
  game.setupNewDay();
  // check if game is over
  if (game.checkForWin()) {
    endGame(game.checkForWin(), game);
  }

  // declare it is day
  game.interaction.channel.send(`It is now day ${game.day}.`);

  // if there were kill(s) last night, send message to channel
  // this probably needs a refactor
  if (killed) {
    const numKilled = killed.length;
    const killedPlayers = killed.map((player) =>
      game.interaction.client.users.cache.get(player.id).toString(),
    );

    const killReport =
      numKilled === 0
        ? 'No one was killed last night.'
        : numKilled === 1
        ? `${numKilled} player was killed last night: ${killedPlayers[0].toString()}`
        : numKilled === 2
        ? `${numKilled} players were killed last night: ${killedPlayers[0].toString()} and ${killedPlayers[1].toString()}`
        : `${numKilled} players were killed last night: ${killedPlayers
            .slice(0, -1)
            .join(', ')}, and ${killedPlayers.slice(-1)[0].toString()}.`;

    game.interaction.channel.send(killReport);
  }

  // tell players to discuss
  game.interaction.channel.send(
    'You have 5 minutes to discuss who you think is suspicious.\nYou can nominate a player to make a defense with /nominate',
  );

  game.state = 'nomination';
  // start day timer of 5 minutes
  game.startDayTimer(startNight);
}

async function promptDefense() {
  game.state = 'defense';

  game.interaction.channel.send('You have 2 minutes to make your defense.');

  setTimeout(() => {
    startHangingVote();
  }, 1000 * 5);

  // setTimeout(() => {
  //   startHangingVote();
  // }, 1000 * 60 * 2);
}

async function startHangingVote() {
  // set game to hanging phase
  game.state = 'hanging';

  // get voted player
  const accusedPlayer = game.accused;
  const accusedPlayerDiscord = await game.interaction.client.users.fetch(
    accusedPlayer.id,
  );

  // clear votes
  game.clearVotes();

  await game.interaction.channel.send(
    `Please vote if you would like to hang ${accusedPlayerDiscord}`,
  );

  const yesButton = new ButtonBuilder()
    .setCustomId('yes')
    .setLabel('Yes')
    .setStyle('Success');
  const noButton = new ButtonBuilder()
    .setCustomId('no')
    .setLabel('No')
    .setStyle('Danger');

  const buttons = new ActionRowBuilder().addComponents([yesButton, noButton]);

  const embed = new EmbedBuilder()
    .setTitle(
      'You have 15 seconds to vote.\nIf you do not vote, you will be considered abstaining.',
    )
    .setDescription(
      `Please vote if you would like to hang ${accusedPlayerDiscord}`,
    );

  const message = await game.interaction.channel.send({
    embeds: [embed],
    components: [buttons],
  });

  const filter = (i) => i.customId === 'yes' || i.customId === 'no';

  // 15 seconds to vote
  const collector = message.createMessageComponentCollector({
    filter,
    time: 15 * 1000,
    // time: 120000,
  });

  collector.on('collect', async (i) => {
    const votingPlayer = game.players.find((p) => p.id === i.user.id);

    // Case for if player has already voted
    if (votingPlayer.hasVoted) {
      await i.reply({
        content: 'You have already voted.',
        ephemeral: true,
      });
      return;
    }

    // Case for if voting player is dead
    if (votingPlayer.isDead) {
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
      await game.interaction.channel.send(
        `${accusedPlayerDiscord} has been hanged.`,
      );
      // FIXME:
      // check if game is over
      // if (game.checkForWin()) {
      //   endGame(game.checkForWin());
      // }
      await game.interaction.channel.send('Now proceeding to night time.');
      // clear the interval since we are proceeding to night
      startNight();
    } else {
      // send message to channel saying there was no majority vote
      await game.interaction.channel.send(
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

async function assignRole(player, role, index) {
  const nickname = game.interaction.guild.members.cache.get(
    player.id,
  ).displayName;

  let newPlayer;

  if (role === Mafia) {
    newPlayer = new Mafia(nickname, player.id);
    mafia.push(newPlayer);
    mafiaInteractions.push(player.interaction);
  } else if (role === Cop) {
    newPlayer = new Cop(nickname, player.id);
    cop = newPlayer;
    copInteractions.push(player.interaction);
  } else if (role === Medic) {
    newPlayer = new Medic(nickname, player.id);
    medic = newPlayer;
    medicInteractions.push(player.interaction);
  } else {
    newPlayer = new Townie(nickname, player.id);
    townies.push(newPlayer);
  }

  await player.interaction.followUp({
    content: `${newPlayer.description}${
      newPlayer.roleExplanation ? newPlayer.roleExplanation : ''
    }`,
    ephemeral: true,
  });

  game.players[index] = newPlayer;
}

module.exports = {
  startGame,
  setupGame,
  startDay,
  startNight,
  promptDefense,
};
