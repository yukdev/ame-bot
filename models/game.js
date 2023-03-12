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
      return 'mafia';
    }
    if (allMafiaDead) {
      return 'townies';
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
    voter.voted = target;
  }

  voteAgainst(voter, target) {
    // add vote to votes object
    this.votes[target.name] = this.votes[target.name] - 1 || -1;
    // set voter's voted property to true
    voter.voted = target;
  }

  async determineLynch() {
    // check if there is a majority vote
    const majorityExists = Object.values(this.votes).some(
      (vote) => vote > this.players.length / 2,
    );

    return majorityExists;
  }
}

module.exports = {
  Game,
};
