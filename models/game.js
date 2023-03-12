/**
 * Mafia Game Class
 */
class Game {
  constructor(interaction) {
    this.interaction = interaction;
    this.players = [];
    this.votes = {};
    this.accused;
    this.inProgress = false;
    this.inNomination = false;
    this.inHanging = false;
    this.day = 0;
    this.cycle = 'day';
    this.dayTime = 0;
    this.timerIntervalId = null;
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
    voter.voted = true;
    this.accused = target;
  }

  determineHanging() {
    // check if there is a majority vote
    const majorityExists = Object.values(this.votes).some(
      (vote) => vote > this.players.length / 2,
    );

    return majorityExists;
  }

  clearVotes() {
    this.votes = {};
    this.accused = undefined;
  }

  startTimer(duration, callback) {
    this.dayTime = duration;
    this.timerIntervalId = setInterval(() => {
      this.dayTime -= 1;
      console.log('startTimer: ', this.dayTime);
      if (this.dayTime <= 0) {
        clearInterval(this.timerIntervalId);
        callback();
      }
    }, 1000);
  }

  pauseTimer() {
    console.log('pauseTimer: ', this.dayTime);
    clearInterval(this.timerIntervalId);
  }

  resumeTimer(callback) {
    this.timerIntervalId = setInterval(() => {
      this.dayTime -= 1;
      console.log('resumeTimer: ', this.dayTime);
      if (this.dayTime <= 0) {
        clearInterval(this.timerIntervalId);
        callback();
      }
    }, 1000);
  }

  resetTimer() {}
}

module.exports = {
  Game,
};
