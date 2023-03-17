import { setUpResponses } from './commands'
import { discordClient } from './discord/connect';
import { deployCommands } from './scripts/deploy-commands';

await deployCommands();
setUpResponses(discordClient);
