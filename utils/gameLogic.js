const {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const { Game } = require('../models/game');
const { Player, Mafia, Townie, Cop, Medic } = require('../models/player');
const { shuffle, getNumberOfMafia } = require('../utils/helperFunctions');

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

async function startGame(interaction, players) {
  // check if game is already in progress
  if (interaction.client.game) {
    await interaction.channel.send('A game is already in progress!');
    return;
  }

  // create new game
  game = new Game(interaction);
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

async function assignRole(
  player,
  user,
  roleName,
  roleDescription,
  needRoleExplanation,
  index,
) {
  const nickname = game.interaction.guild.members.cache.get(
    player.id,
  ).displayName;
  const role = new roleName(nickname, roleDescription, player.id);

  await player.interaction.followUp({
    content: `${user.toString()} ${role.description}${
      needRoleExplanation ? '\n' + role.roleExplanation : ''
    }`,
    ephemeral: true,
  });

  switch (roleName) {
    case Mafia:
      mafia.push(role);
      mafiaInteractions.push(player.interaction);
      break;
    case Cop:
      cop = role;
      copInteractions.push(player.interaction);
      break;
    case Medic:
      medic = role;
      medicInteractions.push(player.interaction);
      break;
    default:
      townies.push(role);
      break;
  }

  game.players[index] = role;
}

async function setupGame() {
  // shuffle players
  shuffle(game.players);
  // FIXME: make game more fair to mafia later
  const mafiaCount = getNumberOfMafia(game.players.length);

  for (let i = 0; i < game.players.length; i++) {
    const player = game.players[i];
    const user = game.interaction.client.users.cache.get(player.id);

    if (i < mafiaCount) {
      await assignRole(player, user, Mafia, 'mafia', false, i);
    } else if (i === game.players.length - 1) {
      await assignRole(player, user, Medic, 'medic', true, i);
    } else if (i === game.players.length - 2) {
      await assignRole(player, user, Cop, 'cop', true, i);
    } else {
      await assignRole(player, user, Townie, 'townie', false, i);
    }
  }

  // send an ephemeral reply to each mafia member telling them who their fellow mafia mates are
  const mafiaMates = game.players.filter((p) => p instanceof Mafia);
  const mafiaMatesUsers = mafiaMates.map((p) =>
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
  const mafiaThreadTopic = `Private thread for Mafia game discussion between ${mafiaInteractions
    .map((m) => m.user.displayName)
    .join(', ')}.`;
  mafiaThread = await createPrivateThread(
    'Mafia Private Thread',
    mafiaInteractions,
    mafiaThreadTopic,
  );

  // create a new private thread for the cop
  const copThreadTopic = 'Private thread for the Cop.';
  copThread = await createPrivateThread(
    'Cop Private Thread',
    copInteractions,
    copThreadTopic,
  );

  // create a new private thread for the medic
  const medicThreadTopic = 'Private thread for the Medic.';
  medicThread = await createPrivateThread(
    'Medic Private Thread',
    medicInteractions,
    medicThreadTopic,
  );

  setTimeout(() => {
    startDay();
  }, 1000 * 5);
}

function startDay(killed) {
  // set cycle to day
  game.cycle = 'day';
  // increment day
  game.day += 1;
  // check if game is over
  if (game.checkForWin()) {
    endGame(game.checkForWin());
  }

  // reset votes and voted properties
  game.votes = {};
  game.accused = null;
  game.players.forEach((p) => (p.voted = false));

  // reset medic, cop, and protected player
  if (medic.alive) {
    medic.reset();
  }
  if (cop.alive) {
    cop.reset();
  }
  const protectedPlayer = game.players.find((player) => player.protected);
  if (protectedPlayer) {
    protectedPlayer.removeProtection();
  }

  // declare it is day
  game.interaction.channel.send(`It is now day ${game.day}.`);

  // if there were kill(s) last night, send message to channel
  if (killed) {
    if (killed.length === 0) {
      game.interaction.channel.send('No one was killed last night.');
    } else if (killed.length === 1) {
      game.interaction.channel.send(
        `${
          killed.length
        } player was killed last night: ${game.interaction.client.users.cache
          .get(killed[0].id)
          .toString()}`,
      );
    } else if (killed.length === 2) {
      game.interaction.channel.send(
        `${
          killed.length
        } players were killed last night: ${game.interaction.client.users.cache
          .get(killed[0].id)
          .toString()} and ${game.interaction.client.users.cache
          .get(killed[1].id)
          .toString()}`,
      );
    } else {
      const killedPlayers = killed.map((player) =>
        game.interaction.client.users.cache.get(player.id),
      );
      const lastKilled = killedPlayers.pop();
      game.interaction.channel.send(
        `${
          killed.length + 1
        } players were killed last night: ${killedPlayers.join(
          ', ',
        )}, and ${lastKilled}.`,
      );
    }
  }

  // tell players to discuss
  game.interaction.channel.send(
    'Please discuss who you think is suspicious.\nYou can nominate a player to make a defense with /nominate',
  );

  game.inNomination = true;

  // start a timer for 5 minutes
  game.startTimer(10, startNight);
}

async function promptDefense() {
  game.inNomination = false;

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
  game.inHanging = true;

  // get voted player
  const votedPlayer = game.players.find((p) => p === game.accused);
  const votedPlayerUser = await game.interaction.client.users.fetch(
    votedPlayer.id,
  );

  // clear votes
  game.clearVotes();
  game.players.forEach((p) => (p.voted = false));

  await game.interaction.channel.send(
    `Please vote if you would like to hang ${votedPlayerUser}`,
  );

  const yesButton = new ButtonBuilder()
    .setCustomId('yes')
    .setLabel('Yes')
    .setStyle('Success');
  const noButton = new ButtonBuilder()
    .setCustomId('no')
    .setLabel('No')
    .setStyle('Danger');

  const row = new ActionRowBuilder().addComponents([yesButton, noButton]);

  const embed = new EmbedBuilder()
    .setTitle(
      'You have 15 seconds to vote.\nIf you do not vote, you will be considered abstaining.',
    )
    .setDescription(`Please vote if you would like to hang ${votedPlayerUser}`);

  const message = await game.interaction.channel.send({
    embeds: [embed],
    components: [row],
  });

  const filter = (i) => i.customId === 'yes' || i.customId === 'no';

  // 15 seconds to vote
  const collector = message.createMessageComponentCollector({
    filter,
    time: 15 * 1000,
    // time: 120000,
  });

  collector.on('collect', async (i) => {
    // get player who voted
    const player = game.players.find((p) => p.id === i.user.id);
    // if player has already voted, return
    if (player.hasVoted) return;
    if (i.customId === 'yes' && i.user.id === votedPlayer.id) {
      await i.reply({
        content: 'You cannot vote to hang yourself.',
        ephemeral: true,
      });
    } else if (i.customId === 'yes') {
      game.vote(player, votedPlayer);
      await i.reply({
        content: `You have voted to hang ${votedPlayerUser}`,
        ephemeral: true,
      });
    } else if (i.customId === 'no') {
      await i.reply({
        content: `You have voted against hanging ${votedPlayerUser}`,
        ephemeral: true,
      });
    }
  });

  collector.on('end', async () => {
    // determine if player should be hanged
    const hangAccused = game.determineHanging();
    // clear votes
    game.clearVotes();
    game.players.forEach((p) => (p.voted = false));
    // if there is a majority vote
    if (hangAccused) {
      // kill player
      votedPlayer.kill();
      // get player's user object
      const playerUser = await game.interaction.client.users.fetch(
        votedPlayer.id,
      );
      await game.interaction.channel.send(`${playerUser} has been hanged.`);
      // FIXME:
      // check if game is over
      // if (game.checkForWin()) {
      //   endGame(game.checkForWin());
      // }
      await game.interaction.channel.send('Now proceeding to night time.');
      // clear the interval since we are proceeding to night
      game.resetTimer();
      startNight();
    } else {
      // send message to channel saying there was no majority vote
      await game.interaction.channel.send(
        'There was no majority vote.\nPlease continue to discuss and nominate players.',
      );
      game.inNomination = true;
      game.resumeTimer(startNight);
    }
  });
}

async function startNight() {
  console.log('state of the game', game);
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

function endGame(winner) {
  if (winner === 'mafia') {
    game.interaction.channel.send('The mafia has won!');
  } else if (winner === 'townies') {
    game.interaction.channel.send('The townies have won!');
  }
  game = null;
}

async function createPrivateThread(name, interactions, topic) {
  const options = {
    autoArchiveDuration: 60,
    name,
    reason: 'Private thread for Mafia game discussion',
    type: ChannelType.PrivateThread,
    invitable: true,
    parent: game.interaction.channel.parent,
    topic,
  };
  const thread = await game.interaction.channel.threads.create(options);

  // lock the thread initially
  await thread.setLocked(true);

  // invite the members to the thread
  await Promise.all(
    interactions.map(async (member) => {
      try {
        await thread.members.add(member.user);
      } catch (err) {
        console.error(
          `Failed to add member ${member.member.nickname} to the thread: ${err}`,
        );
      }
    }),
  );

  return thread;
}

// consider while loop to keep track of time

module.exports = {
  startGame,
  setupGame,
  startDay,
  startNight,
  promptDefense,
};
