const { ChannelType } = require('discord.js');

// shuffle an array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// get role for a player
function getRole(player) {
  return player.role;
}

// determine how many of each role based on number of players
function getNumberOfMafia(numPlayers) {
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

function endGame(winner, game) {
  if (winner === 'mafia') {
    game.interaction.channel.send('The mafia has won!');
  } else if (winner === 'townies') {
    game.interaction.channel.send('The townies have won!');
  }
  game = null;
}

async function createPrivateThread(name, interactions, topic, game) {
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

module.exports = {
  shuffle,
  getRole,
  getNumberOfMafia,
  endGame,
  createPrivateThread,
};
