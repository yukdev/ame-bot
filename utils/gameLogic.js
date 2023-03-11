const MINIMUM_PLAYERS = 4;

const { Game } = require('../models/game');
const { Player, Mafia, Townie, Cop, Medic } = require('../models/mafia');
const { shuffle, getNumberOfMafia } = '../utils/helperFunctions';

let game;

function startGame(message, args) {
  // check if game is already in progress
  if (message.client.game) {
    message.channel.send('A game is already in progress!');
    return;
  }

  // create new game
  game = new Game(message, args);
  // add players to game
  const mentionedUsers = message.mentions.users.array();
  // if not enough players, return
  if (mentionedUsers.length < MINIMUM_PLAYERS) {
    message.channel.send(
      `Cannot start a game without at least ${MINIMUM_PLAYERS} players!`,
    );
    return;
  }

  // add players to game
  mentionedUsers.forEach((user) => {
    game.addPlayer(user);
  });

  // set game to start
  game.inProgress = true;

  // send message to channel
  message.channel.send(
    'The game has started. Read your message carefully for your role and/or powers.',
  );

  setupGame();
}

function setupGame() {
  // shuffle players
  shuffle(game.players);
  // assign roles
  // FIXME: make game more fair to mafia later
  game.players = game.players.map((player, index) => {
    const mafiaCount = getNumberOfMafia(game.players.length);
    if (index < mafiaCount) {
      return new Mafia(player.username, 'mafia');
    } else if (index === game.players.length - 1) {
      return new Medic(player.username, 'medic');
    } else if (index === game.players.length - 2) {
      return new Cop(player.username, 'cop');
    } else {
      return new Townie(player.username, 'townie');
    }
  });
  // how come this doesn't work
  // game.players.forEach((player, index) => {
  //   const mafiaCount = getNumberOfMafia(game.players.length);
  //   if (index < mafiaCount) {
  //     player = new Mafia(player.username, 'mafia');
  //   } else if (index === game.players.length - 1) {
  //     player = new Medic(player.username, 'medic');
  //   } else if (index === game.players.length - 2) {
  //     player = new Cop(player.username, 'cop');
  //   } else {
  //     player = new Townie(player.username, 'townie');
  //   }
  // });

  // FIXME: not currently ephemeral
  // send ephemeral message to players detailing their role
  game.players.forEach((player) => {
    if (player.role !== 'medic' && player.role !== 'cop') {
      player.user.send(`
      ${player.description}
      `);
    } else {
      player.user.send(`
      ${player.description}
      ${player.roleExplanation}
      `);
    }
  });

  startDay();
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

  // reset medic, cop, and protected player
  const medic = game.players.find((player) => player.role === 'medic');
  medic.reset();
  const cop = game.players.find((player) => player.role === 'cop');
  cop.reset();
  const protectedPlayer = game.players.find(
    (player) => player.role === 'protected',
  );
  protectedPlayer.removeProtection();

  // declare it is day
  game.message.channel.send('It is now day.');
  // if there were kill(s) last night, send message to channel
  if (killed) {
    if (killed.length === 0) {
      game.message.channel.send('No one was killed last night.');
    } else if (killed.length === 1) {
      game.message.channel.send(
        `${killed.length} player was killed last night: ${killed[0].name}`,
      );
    } else if (killed.length === 2) {
      game.message.channel.send(
        `${killed.length} players were killed last night: ${killed[0].name} and ${killed[1].name}`,
      );
    } else {
      const killedNames = killed.map((player) => player.name);
      const lastKilled = killedNames.pop();
      game.message.channel.send(
        `${
          killed.length + 1
        } players were killed last night: ${killedNames.join(
          ', ',
        )}, and ${lastKilled}.`,
      );
    }
  }
  // tell players to discuss
  game.message.channel.send(`
  Please discuss who you think is suspicious.
  You can nominate a player to make a defense with /nominate`);
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
