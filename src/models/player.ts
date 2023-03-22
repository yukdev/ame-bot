// Player class for game of Mafia
export class Player {
	name: string;
	id: string;
	role: string;
	isAlive: boolean;
	isProtected: boolean;
	hasNominated: boolean;
	hasVoted: boolean;

	constructor(name: string, id: string) {
		this.name = name;
		this.id = id;
		this.role = '';
		this.isAlive = true;
		this.isProtected = false;
		this.hasNominated = false;
		this.hasVoted = false;
	}

	// kill this player
	kill() {
		this.isAlive = false;
	}

	removeProtection() {
		this.isProtected = false;
	}
}

export class Mafia extends Player {
	description: string;

	constructor(name: string, id: string) {
		super(name, id);
		this.role = 'mafia';
		this.description =
			'\nYou are a member of the mafia.\nYou win when all townies are dead.\nEvery night, you can discuss with your fellow mafia to choose someone to kill.';
	}
}

export class Townie extends Player {
	description: string;

	constructor(name: string, id: string) {
		super(name, id);
		this.role = 'townie';
		this.description =
			'\nYou are a townie.\nYou win when all mafia are dead.\nPlease work together with your fellow townies to find and kill all mafia.';
	}
}

export class Cop extends Townie {
	checkedPlayer: string | null;
	roleExplanation: string;

	constructor(name: string, id: string) {
		super(name, id);
		this.role = 'cop';
		this.roleExplanation = `\nIn addition to being a townie, you are a **${this.role}**.\nEvery night, you have the ability to investigate a player to see if they are a member of the mafia.`;
		this.checkedPlayer = null;
	}

	// actions
	investigate(player: Player) {
		this.checkedPlayer = player.name;
		return player instanceof Mafia ? 'mafia' : 'townie';
	}

	reset() {
		this.checkedPlayer = null;
	}
}

export class Medic extends Townie {
	protectedPlayer: string | null;
	roleExplanation: string;

	constructor(name: string, id: string) {
		super(name, id);
		this.role = 'medic';
		this.roleExplanation = `\nIn addition to being a townie, you are a **${this.role}**.\nEvery night, you have the ability to protect a player from being killed.\nYou cannot protect yourself nor can you protect the same person twice in a row.`;
		this.protectedPlayer = null;
	}

	protect(player: Player) {
		player.isProtected = true;
		this.protectedPlayer = player.name;
	}

	reset() {
		this.protectedPlayer = null;
	}
}

// export class Vigilante extends Townie {
//   roleExplanation: string;

//   constructor(name: string, id: string) {
//     super(name, id);
//     this.roleExplanation = `\nIn addition to being a townie, you are a **${this.role}**.\nYou have the ability to kill a player only once at night.`;
//   }
// }
