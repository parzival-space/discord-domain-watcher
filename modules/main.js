const { status: statusTypes, checkDomain, getChar } = require("./status");
const { writeFileSync } = require("fs");
const { join } = require("path");

// display logo
require("./logo");

const Discord = require("./discord");
let client = new Discord();

let config = require("../data/config.json");
let data = require("../data/data.json");
let { repository, version, author } = require("../package.json");

// setup command
client.commands.on("setup", (msg, args = []) => {
  // check permissions
  if (!msg.member.permissions.has("MANAGE_CHANNELS"))
    return msg
      .reply("You don't have the permission to run this command!")
      .catch(() => {});

  msg.reply("⚠️ Please wait...").then(async (res) => {
    // check if the guild is already setup
    if (data.categorys[msg.guild.id] !== undefined) {
      // verify the action
      if (args[0]?.toUpperCase() === "CONFIRM") {
        // try to get the guilds category
        let category = await msg.guild.channels
          .fetch(data.categorys[msg.guild.id])
          .catch(() => {});

        // if the category still exists, delete it
        if (category !== undefined) await category.delete().catch(() => {});

        // remove domain channels associated with the guild
        data.domains
          .filter((f) => f.guild === msg.guild.id)
          .forEach(async (domain) => {
            // try to get the channel
            let channel = await msg.guild.channels
              .fetch(domain.channel)
              .catch(() => {});

            // if the channel still exists, delete it
            if (channel !== undefined) await channel.delete().catch(() => {});
          });
      } else {
        // warn the user
        return await res
          .edit(
            "🛑 Using this command will remove all your registered domains!\nIf you know what you are doing, use ``!setup confirm`` to proceed anyway."
          )
          .catch(() => {});
      }
    }

    // remove all domains that are still registered to this guild
    data.domains = data.domains.filter((d) => d.guild !== msg.guild.id);

    // create category and move to top
    let category = await msg.guild.channels
      .create("Domain Status", {
        type: "GUILD_CATEGORY",
      })
      .catch(() => {});
    await category.setPosition(0).catch(() => {});

    // push to database
    data.categorys[msg.guild.id] = category.id;

    res
      .edit(
        "✅ Successfully setup the domain status for this guild!\nYou can now add domains using ``!add <domain>``"
      )
      .catch(() => {});
    console.log(`${msg.guild.name} (${msg.guild.id}) has been setup!`);
  });
});

// add/remove domain command
client.commands.on("domain", (msg, args = []) => {
  // check permissions
  if (!msg.member.permissions.has("MANAGE_CHANNELS"))
    return msg
      .reply("You don't have the permission to run this command!")
      .catch(() => {});

  // is a action and a domain is provided?
  if (args.length < 1)
    return msg
      .reply("🛑 Please specifiy what action you want to perform.")
      .catch(() => {});
  if (args.length < 2)
    return msg.reply("🛑 You need to provide a domain!").catch(() => {});

  let action = args[0]?.toUpperCase();
  let domain = args[1];

  msg.reply(`⚠️ Please wait...`).then(async (res) => {
    // check if the guild is already setup
    if (data.categorys[msg.guild.id] === undefined)
      return await res.edit("🛑 This guild is not setup yet!").catch(() => {});

    if (action === "ADD") {
      // check if the domain is already registered
      let i = data.domains.findIndex(
        (d) => d.name === domain && d.guild === msg.guild.id
      );
      if (i !== -1)
        return await res
          .edit("🛑 This domain is already registered!")
          .catch(() => {});

      // check current domain status
      let status = await checkDomain(domain).catch(() => {});
      if (status === undefined)
        return console.log(
          `[Error]`.padEnd(8),
          `Unexpected error while trying to check domain ${domain.name} status!`
        );

      // get category
      let category = await msg.guild.channels
        .fetch(data.categorys[msg.guild.id])
        .catch(() => {});
      if (category === undefined) {
        res.edit(
          `🛑 Something went horribly wrong! Please try running the setup command again and if it still fails, create a new issue on the GitHub repository!`
        );
        console.log(
          `[Error]`.padEnd(8),
          `Unexpected error while trying to get the category for ${domain.name}!`
        );
        return;
      }

      // create new channel
      let channel = await msg.guild.channels
        .create(`${getChar(status, config.indicators)} ${domain}`, {
          type: "GUILD_VOICE",
          permissionOverwrites: [
            {
              id: msg.guild.roles.everyone.id,
              deny: ["CONNECT"],
              allow: ["VIEW_CHANNEL"],
            },
          ],
        })
        .catch(() => {});
      if (channel === undefined) {
        res.edit(
          `🛑 Something went horribly wrong! Please make sure the bot has the permission to create channels in this guild!`
        );
        console.log(
          `[Error]`.padEnd(8),
          `Unexpected error while trying to create a channel for ${domain.name}!`
        );
        return;
      }

      channel.setParent(category);

      // add to database
      data.domains.push({
        channel: channel.id,
        name: domain,
        guild: msg.guild.id,
        lastStatus: status,
      });

      res
        .edit(`✅ Successfully added the domain to the database!`)
        .catch(() => {});
      console.log(`${domain} has been added to the database!`);
    } else if (action === "REMOVE") {
      // check if the domain is registered
      let i = data.domains.findIndex(
        (d) => d.name === domain && d.guild === msg.guild.id
      );
      if (i === -1)
        return await res
          .edit("🛑 This domain is not registered!")
          .catch(() => {});

      // delete channel
      let channel = await msg.guild.channels
        .fetch(data.domains[i].channel)
        .catch(() => {});
      if (channel !== undefined) await channel.delete().catch(() => {});

      // remove from database
      data.domains.splice(i, 1);

      res
        .edit(`✅ Successfully removed the domain from the database!`)
        .catch(() => {});
      console.log(`${domain} has been removed from the database!`);
    }
  });
});

// register about command
client.commands.on("about", (msg, args = []) => {
  let embed = client
    .createEmbed(
      "Domain Watcher",
      `A Discord bot that displays the status of your domains inside your server using channels.\n` +
        `\n` +
        `GitHub: ${repository.url.substring(4)}\n` +
        `Add me: https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=27664`
    )
    .addField("Version", version, true)
    .addField("Author", author.name, true);

  msg.reply({ embeds: [embed] }).catch(() => {});
});

// help command
client.commands.on("help", (msg, args = []) => {
  msg
    .reply(
      `This is a list of all the commands you can use with this bot.\n` +
        `\n` +
        `**${config.discord.prefix}about**\n` +
        `Shows information about this bot.\n` +
        `\n` +
        `**${config.discord.prefix}check <domain>**\n` +
        `Checks the status of the given domain.\n` +
        `\n` +
        `**${config.discord.prefix}domain <add/remove>**\n` +
        `Adds or removes a domain.\n` +
        `\n` +
        `**${config.discord.prefix}help**\n` +
        `Shows this help message.\n` +
        `\n` +
        `**${config.discord.prefix}indicators**\n` +
        `Shows the meaning of the indicators.\n` +
        `\n` +
        `**${config.discord.prefix}setup**\n` +
        `Sets up the bot for the first time.\n`
    )
    .catch(() => {});
});

// indicators command
client.commands.on("indicators", (msg, args = []) => {
  msg
    .reply(
      `Here you can see the meaning of the indicators.\n` +
        `\n` +
        `${config.indicators.reachable} The domain is claimed and serving content.\n` +
        `${config.indicators.websiteError} The domain is claimed and serving content, but the website returned an error.\n` +
        `${config.indicators.unreachable} The domain is claimed and not serving content.\n` +
        `${config.indicators.unclaimed} The domain is not claimed.`
    )
    .catch(() => {});
});

// check domain command
client.commands.on("check", (msg, args = []) => {
  if (args.length < 1)
    return msg.reply("🛑 You need to provide a domain!").catch(() => {});

  let domain = args[0];

  msg.reply(`⚠️ Please wait...`).then(async (res) => {
    // check current domain status
    let status = await checkDomain(domain).catch(() => {});
    if (status === undefined)
      return console.log(
        `[Error]`.padEnd(8),
        `Unexpected error while trying to check domain ${domain.name} status!`
      );

    let statusHuman = "";
    switch (status) {
      case statusTypes.REACHABLE:
        statusHuman = "The domain is claimed and serving content.";
        break;

      case statusTypes.WEBSITE_ERROR:
        statusHuman =
          "The domain is claimed and serving content, but the website returned an error.";
        break;

      case statusTypes.UNREACHABLE:
        statusHuman = "The domain is claimed and not serving content.";
        break;

      case statusTypes.UNCLAIMED:
        statusHuman = "The domain is not claimed.";
        break;
    }

    // send embed
    res
      .edit(
        `${getChar(status, config.indicators)} **${domain}**\n${statusHuman}`
      )
      .catch(() => {});
    console.log(`Preformed manual check, requested by ${msg.author.username}, for domain ${domain}.`);
  });
});

// automated checks and updates
function updateDomains() {
  // check all domains
  data.domains.forEach(async (domain) => {
    let status = await checkDomain(domain.name).catch(() => {});
    if (status === undefined)
      return console.log(
        `[Error]`.padEnd(8),
        `Unexpected error while trying to check domain ${domain.name} status!`
      );

    // update status
    if (status !== domain.lastStatus) {
      if (domain.guild === "0") return;

      let channel = await (
        await client.guilds.fetch(domain.guild).catch(() => {})
      )?.channels
        ?.fetch(domain.channel)
        .catch(() => {});

      // if the channel doesn't exist anymore, delete the domain
      if (channel === undefined)
        return data.domains.splice(
          data.domains.findIndex((d) => d.name === domain.name),
          1
        );

      await channel
        .setName(`${getChar(status, config.indicators)} ${domain.name}`)
        .catch(() =>
          console.log(
            `[Warning]`.padEnd(8),
            `Couldn't update the name of the channel for domain ${domain.name} in ${channel.guild.name}!`
          )
        );
      domain.lastStatus = status;
    }
  });
}

// verify if the registered domains and servers are still valid
async function verifyData() {
  // check if all categories are still valid
  for (let key in data.categorys) {
    if (key === "0") continue;

    // check if still connected to the server
    let guild = await client.guilds.fetch(key).catch(() => {});
    if (guild === undefined) {
      // remove category
      data.categorys[key] = undefined;

      // also remove all associated domains
      data.domains = data.domains.filter((d) => d.guild !== key);

      console.log(
        `[Info]`.padEnd(8),
        `Removed category ${key} because it is no longer connected to a server.`
      );
      continue;
    }

    // check if all associated domains are still valid
    data.domains.forEach(async (domain, i) => {
      if (domain.guild !== key) return;

      // check if the channel still exists
      let channel = await guild.channels.fetch(domain.channel).catch(() => {});
      if (channel === undefined) {
        // remove domain
        data.domains.splice(i, 1);

        console.log(
          `[Info]`.padEnd(8),
          `Removed domain ${domain.name} because it is no longer connected to a channel.`
        );
      }
    });
  }
}

// check once on start and then in the interval defined in config
setInterval(() => {
  updateDomains();
  verifyData();
}, config.discord.interval * 1000 * 60);
client.once("ready", () => {
  updateDomains();
  verifyData();
});

// save data every 5 minutes
setInterval(
  () =>
    writeFileSync(
      join(__dirname, "..", "data", "data.json"),
      JSON.stringify(data)
    ),
  5 * 60 * 1000
);
