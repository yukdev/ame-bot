const { Events } = require('discord.js');

const disses = ['shut up neet', 'no one cares fatty', 'ok idiot'];

module.exports = {
  name: Events.MessageCreate,
  execute(message) {
    if (message.author.id === '107160564454666240') {
      message.reply(disses[Math.floor(Math.random() * disses.length)]);
    }
  },
};
