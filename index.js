const Discord = require('discord.js');
const fs = require('fs');
const RC = require('reaction-core')
const handler = new RC.Handler()

const client = new Discord.Client();
let commands;

if (fs.existsSync('config.js')) {
    console.log("The config file exists!");
    config = require('./config');
    commands = require('./commands');
    client.login(config.BOT_TOKEN);
} else {
    console.log('The config file does not exist, creating it from scratch.');
    fs.writeFile('config.js', "var config = {};\n\n//Variables go here!\nconfig.BOT_TOKEN = 'BOT_TOKEN';\nconfig.prefix = '!';\n\nmodule.exports = config;", function (err) {
        if (err) throw err;
        console.log('Config file created successfully, please add variables to ./config.js and run again.');
        process.exit(0)
    });
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageReactionAdd', (messageReaction, user) => handler.handle(messageReaction, user))

function checkadmin(user) {
    if (user.guild.me.hasPermission('ADMINISTRATOR')) {
        return true;
    } else {
        return false;
    }
}

client.on('message', msg => {
    if (!msg.content.startsWith(config.prefix) || msg.author.bot) return;
    if (msg.content.startsWith(config.prefix)) {
        const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        if (command === 'ping') {
            commands.ping(msg);
        } else if (command === 'help') {
            commands.help(msg, client, args);
        } else if (command === 'setchannel' && checkadmin(msg.member)) {
            commands.setchannel(msg, args, client);
        } else if (command === 'create' && checkadmin(msg.member)) {
            commands.create(msg);
        } else if (command === 'list') {
            commands.list(msg, args);
        } else if (command === 'delete' && checkadmin(msg.member)) {
            commands.delete(msg, args);
        } else if (command === 'submit') {
            commands.submit(msg, args, client);
        } else if (command === 'end' && checkadmin(msg.member)) {
            commands.end(msg, args, client);
        }
    }
});

