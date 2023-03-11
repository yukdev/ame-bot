// Player class for game of Mafia
class Player {
  constructor(name, role) {
    this.name = name;
    this.role = role;
    this.alive = true;
    this.voted = false;
    this.protected = false;
    this.description;
  }

  // kill this player
  kill() {
    this.alive = false;
  }

  removeProtection() {
    this.protected = false;
  }
}

class Mafia extends Player {
  constructor(name, role, description) {
    super(name, role, description);
    this.description = `
    You are a member of the mafia.
    You win when all townies are dead.
    Every night, you can discuss with your fellow mafia to choose someone to kill.`;
  }
}

class Townie extends Player {
  constructor(name, role, description) {
    super(name, role, description);
    this.description = `
    You are a townie.
    You win when all mafia are dead.
    Please work together with your fellow townies to find and kill all mafia.`;
  }

  // actions
  // vote(player) {
  //   player.alive = false;
  // }
}

class Cop extends Townie {
  constructor(name, role, description) {
    super(name, role, description);
    this.roleExplanation = `
    In addition to being a townie, you are a ${this.role}.
    Every night, you have the ability to investigate a player to see if they are a member of the mafia.`;
    this.checkedPlayer;
  }

  // actions
  investigate(player) {
    this.checkedPlayer = player.name;
    return player.role === 'mafia' ? 'mafia' : 'a townie';
  }

  reset() {
    this.checkedPlayer = undefined;
  }
}

class Medic extends Townie {
  constructor(name, role, description) {
    super(name, role, description);
    this.roleExplanation = `
    In addition to being a townie, you are a ${this.role}.
    Every night, you have the ability to protect a player from being killed.
    You cannot protect yourself nor can you protect the same person twice in a row.`;
    this.protectedPlayer;
  }

  protect(player) {
    player.protected = true;
    this.protectedPlayer = player.name;
  }

  reset() {
    this.protectedPlayer = undefined;
  }
}

class Vigilante extends Townie {
  constructor(name, role, description) {
    super(name, role, description);
    this.roleExplanation = `
    In addition to being a townie, you are a ${this.role}.
    You have the ability to kill a player only once at night.`;
  }
}

module.exports = {
  Player,
  Mafia,
  Townie,
  Cop,
  Medic,
  Vigilante,
};
