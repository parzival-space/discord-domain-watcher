const { Client, Intents, MessageEmbed } = require('discord.js');
const EventEmiter = require('events');
const config = require('../data/config.json');

class ExtendedClient extends Client {
  constructor() {
    super({ intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES ] });

    this.on("ready", () => {
      // do some post login stuff
      console.log(`Logged in as ${this.user.username}!`);
      this.#init();
    });
    
    this.login(config.discord.token);

    this.commands = new EventEmiter();
  }

  #init() {
    // create command listeners
    this.on("message", msg => {
      if (msg.author.bot) return;
      
      // check if message is a command
      if (!msg.content.startsWith(config.discord.prefix)) return;

      // now fetch the command
      let parts = msg.content.substring(config.discord.prefix.length).split(" ");
      let command = parts.splice(0, 1)[0];

      // emit command event
      this.commands.emit(command, msg, parts);
    });
  }

  createEmbed(title, description, color = 0xFFFFFF) {
    return new MessageEmbed()
      .setTitle(title)
      .setDescription(description)
      .setColor(color);
  }
}

module.exports = ExtendedClient;