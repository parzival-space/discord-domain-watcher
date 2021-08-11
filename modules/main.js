const { status, checkDomain, getChar } = require("./status");
const { Message } = require("discord.js");

// display logo
require('./logo');

const Discord = require("./discord");
let client = new Discord();

let config = require("../data/config.json");
let data = require("../data/data.json");

// setup command
client.commands.on("setup", (msg, args = []) => {
  msg.reply("⚠️ Please wait...").then(async (res) => {
    // check if the guild is already setup
    if (data.categorys[msg.guild.id] !== undefined) {
      // verify the action
      if (args[0]?.toUpperCase() === "CONFIRM") {
        // try to get the guilds category
        let category = await msg.guild.channels.fetch(
          data.categorys[msg.guild.id]
        );

        // remove all child channels
        category.children.forEach(async (child) => {
          // remove database entrys if available
          let i = data.domains.findIndex((domain) => domain.id === child.id);
          data.domains.splice(i, 1);

          await child.delete();
        });
        await category.delete();
      } else {
        // warn the user
        return await res.edit(
          "🛑 Using this command will remove all your registered domains!\nIf you know what you are doing, use ``!setup confirm`` to proceed anyway."
        );
      }
    }

    // create category and move to top
    let category = await msg.guild.channels.create("Domain Status", {
      type: "GUILD_CATEGORY",
    });
    await category.setPosition(0);

    // push to database
    data.categorys[msg.guild.id] = category.id;

    res.edit("✅ Successfully setup the domain status for this guild!\nYou can now add domains using ``!add <domain>``");
  });
});

// add domain command
client.commands.on("add", (msg, args = []) => {
  let domain = args[0];

  msg.reply(`⚠️ Please wait...`).then(async (res) => {
    // check if the guild is already setup
    if (data.categorys[msg.guild.id] === undefined) return await res.edit("🛑 This guild is not setup yet!");

    // check if the domain is already registered
    let i = data.domains.findIndex((domain) => domain.domain === domain);
    if (i !== -1)
      return await res.edit("🛑 This domain is already registered!");

    // check current domain status
    let status = await checkDomain(domain);

    // create new channel and add to category
    let category = await msg.guild.channels.fetch(data.categorys[msg.guild.id]);
    let channel = await msg.guild.channels.create(
      `${getChar(status, config.indicators)} ${domain}`,
      {
        type: "GUILD_VOICE",
        permissionOverwrites: [
          {
            id: msg.guild.roles.everyone.id,
            deny: ["CONNECT"],
            allow: ["VIEW_CHANNEL"],
          },
        ],
      }
    );
    channel.setParent(category);

    // add to database
    data.domains.push({
      id: channel.id,
      domain: domain,
      status: status,
    });

    res.edit(`✅ Successfully added the domain to the database!`);
  });
});
