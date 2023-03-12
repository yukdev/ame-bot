const { startNight } = require('../utils/gameLogic');

/**
 * Mafia Game Class
 */
class Game {
  constructor(interaction) {
    this.interaction = interaction;
    this.players = [];
    this.votes = {};
    this.voted;
    this.inProgress = false;
    this.inNomination = false;
    this.inLynching = false;
    this.day = 0;
    this.cycle = 'day';
  }

  checkForWin() {
    // check if all townies are dead
    const allTowniesDead = this.players
      .filter((p) => p.role === 'townie')
      .every((p) => p.alive === false);
    // check if all mafia are dead
    const allMafiaDead = this.players
      .filter((p) => p.role === 'mafia')
      .every((p) => p.alive === false);
    // check if mafia is half or more of the players
    const mafiaIsMajority =
      this.players.filter((p) => p.role === 'mafia').length >=
      this.players.length / 2;

    if (allTowniesDead || mafiaIsMajority) {
      return this.end('mafia');
    }
    if (allMafiaDead) {
      return this.end('townies');
    }

    return;
  }

  addPlayer(player) {
    this.players.push(player);
  }

  vote(voter, target) {
    // add vote to votes object
    this.votes[target.name] = this.votes[target.name] + 1 || 1;
    // set voter's voted property to true
    voter.voted = true;
    console.log(
      '🚀 ~ file: game.js:50 ~ Game ~ vote ~ this.votes:',
      this.votes,
    );
  }

  voteAgainst(voter, target) {
    // add vote to votes object
    this.votes[target.name] = this.votes[target.name] - 1 || -1;
    // set voter's voted property to true
    voter.voted = true;
    console.log(
      '🚀 ~ file: game.js:50 ~ Game ~ vote ~ this.votes:',
      this.votes,
    );
  }

  async promptDefense() {
    // get player with majority vote
    const playerWithMajority = Object.keys(this.votes).reduce((a, b) =>
      this.votes[a] > this.votes[b] ? a : b,
    );
    this.voted = playerWithMajority;
    // clear votes object and set all players' voted property to false
    this.votes = {};
    this.players.forEach((p) => (p.voted = false));
    // get voted player's id
    const votedPlayerId = this.players.find((p) => p.name === this.voted).id;
    // get voted player's user object
    const votedPlayerUser = await this.interaction.client.users.fetch(
      votedPlayerId,
    );
    // prompt player to make statement
    await this.interaction.channel.send(
      `${votedPlayerUser} had the majority of votes. You have 2 minutes to plea your case.`,
    );
  }

  async determineLynch() {
    // check if there is a majority vote
    const majorityExists = Object.values(this.votes).some(
      (vote) => vote > this.players.length / 2,
    );
    // if there is a majority vote
    if (majorityExists) {
      // get player with majority vote
      const playerWithMajority = Object.keys(this.votes).reduce((a, b) =>
        this.votes[a] > this.votes[b] ? a : b,
      );
      // get player object from player name
      const player = this.players.find((p) => p.name === playerWithMajority);
      // kill player
      player.kill();
      // get player's user object
      const playerUser = await this.interaction.client.users.fetch(player.id);
      await this.interaction.channel.send(`${playerUser} has been lynched.`);
      // check if game is over
      this.checkForWin();
    } else {
      // send message to channel saying there was no majority vote
      await this.interaction.channel.send('There was no majority vote.');
    }
    // reset votes and voted properties
    this.votes = {};
    this.voted = null;
    this.players.forEach((p) => (p.voted = false));
    // transition to night
    // startNight();
    return;
  }
}

module.exports = {
  Game,
};
