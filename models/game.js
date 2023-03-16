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
    this.dayTime = 300;
    this.dayOver = false;
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
    this.accused = null;
  }

  startDayTimer() {
    this.timerIntervalId = setInterval(() => {
      this.dayTime -= 1;
      console.log('startTimer: ', this.dayTime);
      if (this.dayTime <= 0) {
        this.dayOver = true;
        clearInterval(this.timerIntervalId);
      }
    }, 1000);
  }

  pauseDayTimer() {
    console.log('pauseTimer: ', this.dayTime);
    clearInterval(this.timerIntervalId);
  }

  setupNewDay() {
    this.day += 1;
    this.cycle = 'day';
    this.dayTime = 300;
    this.dayOver = false;
    this.clearVotes();
    this.players.forEach((p) => {
      if (p.alive) {
        if (p.role === 'cop' || p.role === 'medic') {
          p.reset();
        }
        if (p.protected) {
          p.removeProtection();
        }
      }
      p.voted = false;
    });
  }
}

module.exports = {
  Game,
};
