const { startNight } = require('../utils/gameLogic');

/**
 * Mafia Game Class
 */
class Game {
  constructor(interaction) {
    this.interaction = interaction;
    this.players = [];
    this.votes = {};
    this.inProgress = false;
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

  nominate(voter, target) {
    // add vote to votes object
    this.votes[target] = this.votes[target] + 1 || 1;
    // set voter's voted property to true
    voter.voted = true;
  }

  promptStatement() {
    // get player with majority vote
    const playerWithMajority = Object.keys(this.votes).reduce((a, b) =>
      this.votes[a] > this.votes[b] ? a : b,
    );
    // get player object from player name
    const player = this.players.find((p) => p.name === playerWithMajority);
    // clear votes object and set all players' voted property to false
    this.votes = {};
    this.players.forEach((p) => (p.voted = false));
    // prompt player to make statement
    // make this ping later
    this.message.channel.send(
      `${player.name} had the majority of votes. Please plea your case.`,
    );
  }

  lynchVote(voter, target) {
    // add vote to votes object
    this.votes[target] = this.votes[target] + 1 || 1;
    // set voter's voted property to true
    voter.voted = true;
  }

  determineLynch() {
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
      // check if game is over
      this.checkForWin();
    } else {
      // send message to channel saying there was no majority vote
      this.message.channel.send('There was no majority vote.');
    }
    // clear votes object and set all players' voted property to false
    this.votes = {};
    this.players.forEach((p) => (p.voted = false));

    // transition to night
    startNight();
  }
}

module.exports = {
  Game,
};
