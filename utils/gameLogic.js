const MINIMUM_PLAYERS = 4;

const { Game } = require('../models/game');
const { Player, Mafia, Townie, Cop, Medic } = require('../models/player');
const { shuffle, getNumberOfMafia } = require('../utils/helperFunctions');

let game;

async function startGame(interaction, players) {
  // check if game is already in progress
  // if (message.client.game) {
  //   message.channel.send('A game is already in progress!');
  //   return;
  // }

  // create new game
  game = new Game(interaction);
  // add players to game
  players.forEach((user) => {
    game.addPlayer(user);
  });

  // set game to start
  game.inProgress = true;

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

  setTimeout(() => {
    startDay();
  }, 5000);
}

function startDay(killed) {
  // set cycle to day
  game.cycle = 'day';
  // increment day
  game.day += 1;
  // check if game is over
  // if (game.checkForWin()) {
  //   endGame(game.checkForWin());
  // }

  // reset medic, cop, and protected player
  const medic = game.players.find((player) => player.role === 'medic');
  medic.reset();
  const cop = game.players.find((player) => player.role === 'cop');
  cop.reset();
  const protectedPlayer = game.players.find(
    (player) => player.role === 'protected',
  );
  if (protectedPlayer) {
    protectedPlayer.removeProtection();
  }

  // declare it is day
  game.interaction.channel.send('It is now day.');
  // if there were kill(s) last night, send message to channel
  if (killed) {
    if (killed.length === 0) {
      game.interaction.channel.send('No one was killed last night.');
    } else if (killed.length === 1) {
      game.interaction.channel.send(
        `${killed.length} player was killed last night: ${killed[0].name}`,
      );
    } else if (killed.length === 2) {
      game.interaction.channel.send(
        `${killed.length} players were killed last night: ${killed[0].name} and ${killed[1].name}`,
      );
    } else {
      const killedNames = killed.map((player) => player.name);
      const lastKilled = killedNames.pop();
      game.interaction.channel.send(
        `${
          killed.length + 1
        } players were killed last night: ${killedNames.join(
          ', ',
        )}, and ${lastKilled}.`,
      );
    }
  }
  // tell players to discuss
  game.interaction.channel.send(
    'Please discuss who you think is suspicious.\nYou can nominate a player to make a defense with /nominate',
  );

  return;
}

function startNight() {
  // set cycle to night
  game.cycle = 'night';

  let [mafiaDone, copDone, medicDone] = [false, false, false];
  const killed = [];

  // grab mafia members
  const mafia = game.players.filter((p) => p.role === 'mafia');
  // create a private thread for the mafia members
  // send message to that thread
  // FIXME, use discord bot option selection
  game.message.channel.send(`
  Mafia, it is now night.
  Please discuss amongst yourself who to kill.
  When you have decided on a target, please choose them from the options.`);
  // FIXME: set chosen player to variable
  const chosenPlayer = new Player();
  // Send confirmation message after mafia has chosen a player
  game.message.channel.send(`
  Your target has been confirmed.
  Please wait for the other roles to make their decisions.`);
  // somehow check if they made their decision
  // mafiaDone = true;

  // check to see if cop is alive
  if (game.players.some((p) => p.role === 'cop')) {
    // create a private thread for the cop
    // send message to that thread
    game.message.channel.send(`
    Cop, it is now night.
    Please choose a player to investigate.`);
    // after cop has chosen a player, send message to channel
    const cop = game.players.find((p) => p.role === 'cop');
    game.message.channel.send(`${cop.checkedPlayer} is ${cop.investgate()}.`);
    // somehow check if they made their decision
    // copDone = true;
  }

  // check to see if medic is alive
  if (game.players.some((p) => p.role === 'medic')) {
    // create a private thread for the medic
    // send message to that thread
    game.message.channel.send(`
    Medic, it is now night.
    Please choose a player to save.`);
    // after medic has chosen a player, send message to channel
    const medic = game.players.find((p) => p.role === 'medic');
    game.message.channel.send(
      `${medic.savedPlayer} is safe from being killed tonight.`,
    );
    // somehow check if they made their decision
    // medicDone = true;
  }
  // consideration for if medic and/or cop are dead.
  // set a timer for a variable amount of time so people can't metagame.

  if (mafiaDone && copDone && medicDone) {
    // determine if the person mafia shot is dead
    const medic = game.players.find((p) => p.role === 'medic');
    if (medic.savedPlayer !== chosenPlayer) {
      killed.push(chosenPlayer);
      chosenPlayer.kill();
    }
    // start day
    startDay(killed);
  }
}

function endGame(winner) {
  if (winner === 'mafia') {
    game.message.channel.send('The mafia has won!');
  } else if (winner === 'townies') {
    game.message.channel.send('The townies have won!');
  }
  game = null;
}

module.exports = {
  startGame,
  setupGame,
  startDay,
  startNight,
};
