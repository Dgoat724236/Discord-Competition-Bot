const Discord = require('discord.js');
const config = require('./config');
const Enmap = require("enmap");
const RC = require('reaction-core')
const fs = require('fs')
const request = require("request")

//const Canvas = require('canvas');
//var sizeOf = require('image-size');

const submissions = new Enmap({
    name: 'submissions',
    fetchAll: false,
    autoFetch: true,
    cloneLevel: 'deep'
})

const competitions = new Enmap({
    name: 'competitions',
    fetchAll: false,
    autoFetch: true,
    cloneLevel: 'deep'
});

let opencompetitionlist = new Array();
let closedcompetitionlist = new Array();
if (competitions.get("opencompetitionlist")) {
    opencompetitionlist = competitions.get("opencompetitionlist");
    var i;
    for (i = 0; i < opencompetitionlist.length; i++) {
        fs.readFile(`./data/competitions/${opencompetitionlist[i]}.json`, (err, data) => {
            if (err) throw err;
            let tempStartEmbedData = new Enmap();
            tempStartEmbedData.import(data, true, false);
            if (tempStartEmbedData.get("open")) {
                tempStartEmbedData.clear();
                return;
            } else {
                tempStartEmbedData.set("open", false);
                var competitionCode = tempStartEmbedData.get("code")
                let jsonexport = tempStartEmbedData.export();
                fs.writeFile(`./data/competitions/${competitionCode}.json`, jsonexport, (err) => {
                    if (err) throw err;
                    closedcompetitionlist.push(competitionCode);
                    opencompetitionlist.splice(i, 1);
                    tempStartEmbedData.clear();
                });
            }
        });
    }
}

const download = (url, path, callback) => {
    request.head(url, (err, res, body) => {
        request(url)
            .pipe(fs.createWriteStream(path))
            .on('close', callback)
    })
}

const settings = new Enmap({
    name: 'settings',
    fetchAll: false,
    autoFetch: true,
    cloneLevel: 'deep'
});

function get_url_extension(url) {
    return url.split(/[#?]/)[0].split('.').pop().trim();
}

var submissionslist = new Array();
var submissionliststorage = submissions.get("submissionlist")

if (submissionliststorage != undefined) {
    submissionslist = submissionliststorage;
}

module.exports = {
    ping: function (msg) {
        var currentDate = new Date();
        msg.reply('pong! This took ' + (currentDate.getTime() - msg.createdTimestamp) + ' ms.');
    },
    help: function (msg, client, args) {

        var helpEmbed = new Discord.MessageEmbed();

        if (args[0] === 'admin') {
            helpEmbed.setColor('#99679e');
            helpEmbed.setTitle('Game Tiem Competition Bot: Admin Help');
            helpEmbed.setAuthor(client.user.username, client.user.avatarURL(), 'https://github.com/Dgoat724236/Discord-Competition-Bot');
            helpEmbed.addFields(
                { name: config.prefix + 'setchannel [channel]', value: 'Sets the channel where submissions are posted.', inline: true },
                { name: config.prefix + 'create', value: 'Begin the process of creating a competition.', inline: true },
                { name: config.prefix + 'delete *competitioncode*', value: 'Delete a competition.', inline: true },
                { name: config.prefix + 'end [competitioncode]', value: 'This will end the competition and create a poll. Everyone in the channel will be able to vote for the winner.', inline: true },
                { name: config.prefix + 'vote [submissionid]', value: 'This will let you vote for a submission.', inline: true },
                { name: config.prefix + 'see [submissionid]', value: 'This will repost the submission of your choosing. Everyone in the channel will be able to vote for the winner.', inline: true },
                { name: config.prefix + 'announce [competitioncode] [channel]', value: 'This will announce the result of the competition in the channel of your choosing', inline: true }
            )
            helpEmbed.setTimestamp();
            helpEmbed.setFooter('If I break, please make an issue on the GitHub!');
        } else {
            helpEmbed.setColor('#99679e');
            helpEmbed.setTitle('Game Tiem Competition Bot: Help');
            helpEmbed.setAuthor(client.user.username, client.user.avatarURL(), 'https://github.com/Dgoat724236/Discord-Competition-Bot');
            helpEmbed.addFields(
                { name: config.prefix + 'list [competitioncode]', value: 'This will send you all the information you need to begin working on a server icon!', inline: true },
                { name: config.prefix + 'submit [competitioncode]', value: 'This will begin the process of submitting an image.', inline: true }
            )
            helpEmbed.setTimestamp();
            helpEmbed.setFooter('If I break, please make an issue on the GitHub!');
        };

        msg.reply(helpEmbed);
    },
    setchannel: async function (msg, args, client) {

        var channel;
        settings.defer.then(() => {
            console.log(settings.size + " keys loaded");
            if (args[0]) {
                var channelMessage = args[0];
                var channelId = channelMessage.replace("<#", "").replace(">", "")
                var channel = client.channels.cache.get(channelId);
                settings.set('channel', channel);
                msg.reply('Submission channel set to <#' + channel.id + '>.');
            } else {
                let filter = m => msg.author.id === m.author.id;
                msg.reply('What channel would you like?').then(m => {
                    msg.channel.awaitMessages(filter, {
                        time: 60000,
                        max: 1,
                        errors: ['time']
                    }).then(messages => {
                        var channelMessage = messages.first().content;
                        var channelId = channelMessage.replace("<#", "").replace(">", "")
                        var channel = client.channels.cache.get(channelId);
                        settings.set('channel', channel);
                        msg.reply('Submission channel set to <#' + channel.id + '>.');
                    })
                    .catch(() => {
                        msg.reply(`No input received.`);
                    });
                });
            }
        });

    },
    create: async function (msg) {

        let competitionCode;

        //Step 1: Get competition name
        let filter = m => msg.author.id === m.author.id;
        msg.reply('What should the competition code be? ex. jan2021').then(m => {
            msg.channel.awaitMessages(filter, {
                time: 60000,
                max: 1,
                errors: ['time']
            }).then(messages => {
                competitionCode = messages.first().content;
                competition = new Enmap({
                    name: competitionCode,
                    fetchAll: false,
                    autoFetch: true,
                    cloneLevel: 'deep'
                });
                competition.set("code", competitionCode)
                msg.reply('Competition ' + competitionCode + ' created!');

                //Step 2
                msg.reply('What should the competition description be?').then(m => {
                    msg.channel.awaitMessages(filter, {
                        time: 60000,
                        max: 1,
                        errors: ['time']
                    }).then(messages => {
                        competition.set("description", messages.first().content);
                        msg.reply('Description set as: ' + competition.get("description"));

                        //Step 3
                        msg.reply('What should the base image be?').then(m => {
                            msg.channel.awaitMessages(filter, {
                                time: 60000,
                                max: 1,
                                errors: ['time']
                            }).then(messages => {
                                imageMessage = messages.first()
                                if (imageMessage.attachments.size > 0) {
                                    imageMessage.attachments.forEach(Attachment => {
                                        download(Attachment.url, `./data/images/` + `${competitionCode}.${get_url_extension(Attachment.url)}`, () => {
                                            competition.set("image", `./data/images/${competitionCode}.${get_url_extension(Attachment.url)}`);
                                            msg.reply('Image received!');
                                            competition.set("open", true)
                                            competition.set("vote", false)
                                            let jsonexport = competition.export();
                                            fs.writeFile(`./data/competitions/${competitionCode}.json`, jsonexport, (err) => {
                                                if (err) throw err;
                                                console.log('The file has been saved!');
                                                competition.clear();
                                                opencompetitionlist.push(competitionCode);
                                                competitions.set("opencompetitionlist", opencompetitionlist)
                                                msg.reply(`Competition ${competitionCode} created!`)
                                            });
                                        });
                                    });
                                } else {
                                    msg.reply('Please submit a valid image.')
                                }
                            });
                        }).catch(() => {
                            msg.reply('No input received.');
                            console.log("step 3");;
                        });
                    });
                }).catch(() => {
                    msg.reply(`No input received.`);
                });
            });
        }).catch(() => {
            msg.reply(`No input received.`);
        });
    },
    list: async function (msg, args) {

        var listAskEmbed = new Discord.MessageEmbed();
        var listInfoEmbed = new Discord.MessageEmbed();

        function list(competition) {
            fs.readFile(`./data/competitions/${competition}.json`, (err, data) => {
                if (err) throw err;
                let tempListEmbedData = new Enmap();
                tempListEmbedData.import(data, true, false);

                listInfoEmbed.setTitle(competition);
                listInfoEmbed.setDescription(tempListEmbedData.get("description"));
                const attachment = new Discord.MessageAttachment(tempListEmbedData.get("image"), 'image.png');
                listInfoEmbed.attachFiles(attachment);
                listInfoEmbed.setImage('attachment://image.png');
                listInfoEmbed.setTimestamp();
                listInfoEmbed.setFooter('Submit by doing "' + config.prefix + 'submit [competitioncode]"')
                msg.reply(listInfoEmbed);
                tempListEmbedData.clear();
            });
        }

        if (args[0] && opencompetitionlist.includes(args[0])) {
            list(args[0])
        } else {
            listAskEmbed.setTitle("Please type a competition code:");
            let listAskEmbedList = new String();
            if (0 < opencompetitionlist.length) {
                var i;
                for (i = 0; i < opencompetitionlist.length; i++) {
                    listAskEmbedList += `${i + 1}. ${opencompetitionlist[i]}\n`;
                }
                listAskEmbed.setDescription(listAskEmbedList);
            } else {
                listAskEmbed.setDescription('No competitions available!');
            }

            let filter = m => msg.author.id === m.author.id;
            msg.reply(listAskEmbed).then(m => {
                msg.channel.awaitMessages(filter, {
                    time: 60000,
                    max: 1,
                    errors: ['time']
                }).then(messages => {
                    if (opencompetitionlist.includes(messages.first().content)) {
                        list(messages.first().content)
                    }
                }).catch(() => {
                    msg.reply(`No input received.`);
                });
            });
        }
    },
    delete: function (msg, args) {
        if (args[0] && opencompetitionlist.includes(args[0])) {
            var i;
            for (i = 0; i < opencompetitionlist.length; i++) {
                if (args[0] === opencompetitionlist[i]) {
                    opencompetitionlist.splice(i, 1);
                    competitions.set("opencompetitionlist", opencompetitionlist);
                    fs.readFile(`./data/competitions/${args[0]}.json`, (err, data) => {
                        if (err) throw err;
                        let tempDelData = new Enmap();
                        tempDelData.import(data, true, false);
                        fs.rmSync(`./data/competitions/${args[0]}.json`);
                        fs.rmSync(tempDelData.get("image"));
                        tempDelData.clear();
                        msg.reply(`${args[0]} deleted.`)
                    });
                } else {
                    i++;
                }
            }
        } else {
            msg.reply('Please specify a valid competition code.')
        }
    },
    submit: async function (msg, args, client) {
        
        var botMsg;
        var submitAskEmbed = new Discord.MessageEmbed();

        function submit(competition) {
            let filter = m => msg.author.id === m.author.id;
            msg.reply("Please send your submission, along with a brief description.").then(m => {
                botMsg = m;
                msg.channel.awaitMessages(filter, {
                    time: 60000,
                    max: 1,
                    errors: ['time']
                }).then(messages => {
                    submissionMessage = messages.first()
                    if (submissionMessage.attachments.size > 0) {
                        submissionMessage.attachments.forEach(Attachment => {
                            let submissionId;
                            do {
                                submissionId = Math.floor(1000 + Math.random() * 9000);
                            } while (fs.existsSync(`./data/images/${submissionId}.${get_url_extension(Attachment.url)}`));

                            submissionId = String(submissionId);

                            download(Attachment.url, `./data/images/${submissionId}.${get_url_extension(Attachment.url)}`, () => {
                                let submissionProperties = new Map();
                                submissionProperties.set("code", competition)
                                submissionProperties.set("id", submissionId)
                                submissionProperties.set("image", `./data/images/${submissionId}.${get_url_extension(Attachment.url)}`)
                                submissionProperties.set("user", submissionMessage.author)
                                submissionProperties.set("time", submissionMessage.createdAt)
                                submissionProperties.set("description", submissionMessage.content)

                                var submissionEmbed = new Discord.MessageEmbed();

                                submissionEmbed.setAuthor(submissionProperties.get("user").username, submissionProperties.get("user").avatarURL());
                                submissionEmbed.setTitle(`${submissionProperties.get("code")}: submission #${submissionProperties.get("id")}`);
                                submissionEmbed.setDescription(submissionProperties.get("description"));
                                const attachment = new Discord.MessageAttachment(submissionProperties.get("image"), 'image.png');
                                submissionEmbed.attachFiles(attachment);
                                submissionEmbed.setImage('attachment://image.png');
                                submissionEmbed.setTimestamp(submissionProperties.get("time"));

                                var channel = settings.get('channel');
                                var submissionChannel = client.channels.cache.get(channel.id);
                                submissionChannel.send(submissionEmbed).then(m => {
                                    saveMsg = m;
                                    submissionProperties.set("message", saveMsg);
                                    console.log(submissionProperties.get("message"))
                                    submissions.set(submissionId, submissionProperties)
                                });

                                if (submissionliststorage === undefined) {
                                    submissionslist.push(submissionId)
                                    submissions.set("submissionlist", submissionslist)
                                } else {
                                    submissionslist = submissionliststorage;
                                    submissionslist.push(submissionId)
                                    submissions.set("submissionlist", submissionslist)
                                }

                                botMsg.delete();
                                submissionMessage.delete();
                                msg.reply(`Submission received! Your submission ID is: #${submissionProperties.get("id")}`)
                            });
                        });
                    } else {
                        msg.reply('Please submit a valid image.')
                    }
                });
            });
        }

        if (args[0] && opencompetitionlist.includes(args[0])) {
            submit(args[0], )
        } else {
            submitAskEmbed.setTitle("Please type a competition code:");
            let submitAskEmbedList = new String();
            if (0 < opencompetitionlist.length) {
                var i;
                for (i = 0; i < opencompetitionlist.length; i++) {
                    submitAskEmbedList += `${i + 1}. ${opencompetitionlist[i]}\n`;
                }
                submitAskEmbed.setDescription(submitAskEmbedList);
            } else {
                submitAskEmbed.setDescription('No competitions available!');
            }

            let filter = m => msg.author.id === m.author.id;
            msg.reply(submitAskEmbed).then(m => {
                msg.channel.awaitMessages(filter, {
                    time: 60000,
                    max: 1,
                    errors: ['time']
                }).then(messages => {
                    if (opencompetitionlist.includes(messages.first().content)) {
                        submit(messages.first().content)
                    } else {
                        msg.reply("Please submit a valid code.")
                    }
                });
            });
        }
    },
    end: function (msg, args, client) {
        var endAskEmbed = new Discord.MessageEmbed();

        function end(competition) {
            fs.readFile(`./data/competitions/${competition}.json`, (err, data) => {
                if (err) throw err;
                let tempEndData = new Enmap({ name: competition });
                tempEndData.import(data, true, false);
                tempEndData.set("open", false)
                tempEndData.set("vote", true)
                let jsonexport = tempEndData.export();
                console.log(jsonexport);
                fs.writeFile(`./data/competitions/${competition}.json`, jsonexport, (err) => {
                    if (err) throw err;
                    console.log('The file has been saved!');
                    tempEndData.clear();
                });
                for (i = 0; i < opencompetitionlist.length; i++) {
                    if (competition === opencompetitionlist[i]) {
                        opencompetitionlist.splice(i, 1);
                        closedcompetitionlist.push(competition);
                        console.log("Successfully ended!")
                    } else {
                        i++;
                    }
                }

                var endEmbed = new Discord.MessageEmbed();

                //Get submissions and make into jumpable list
                var endEmbedFieldList = new String();
                for (i = 0; i < submissionslist.length; i++) {
                    var submissionCompetition = submissions.get(submissionslist[i]);
                    if (submissionCompetition.get('code') === competition) {
                        endEmbedFieldList += `${submissionCompetition.get("id")} [Jump!](https://discord.com/channels/${submissionCompetition.get("message").guild.id}/${submissionCompetition.get("message").channel.id}/${submissionCompetition.get("message").id})\n`
                        console.log(endEmbedFieldList);
                    }
                }

                endEmbed.setTitle(`${competition} has ended!`);
                endEmbed.setDescription("Please look at the submissions and decide on your favorite.");
                endEmbed.addField("List of submissions", endEmbedFieldList);
                endEmbed.setTimestamp();
                endEmbed.setFooter('Vote by doing "' + config.prefix + 'vote [competitioncode]"')

                var channel = settings.get('channel');
                var submissionChannel = client.channels.cache.get(channel.id);

                submissionChannel.send(endEmbed);
            });
        }

        if (args[0] && opencompetitionlist.includes(args[0])) {
            end(args[0]);
        } else {
            endAskEmbed.setTitle("Please type a competition code:");
            let endAskEmbedList = new String();
            if (0 < opencompetitionlist.length) {
                var i;
                for (i = 0; i < opencompetitionlist.length; i++) {
                    endAskEmbedList += `${i + 1}. ${opencompetitionlist[i]}\n`;
                }
                endAskEmbed.setDescription(endAskEmbedList);
            } else {
                endAskEmbed.setDescription('No competitions available!');
            }

            let filter = m => msg.author.id === m.author.id;
            msg.reply(endAskEmbed).then(m => {
                msg.channel.awaitMessages(filter, {
                    time: 60000,
                    max: 1,
                    errors: ['time']
                }).then(messages => {
                    if (opencompetitionlist.includes(messages.first().content)) {
                        end(messages.first().content);
                    } else {
                        msg.reply("Please submit a valid code.")
                    }
                });
            });
        }
    }
}
/*
module.exports = {
    ping: function (msg) {
        var currentDate = new Date();
        msg.reply('pong! This took ' + (currentDate.getTime() - msg.createdTimestamp) + ' ms.');
    },
    help: function (msg, client, args) {

        var helpEmbed = new Discord.MessageEmbed();

        if (args[0] === 'ping') {
            helpEmbed.setColor('#13613A');
            helpEmbed.setTitle('Meme Generator Help: Ping Command');
            helpEmbed.setURL('https://github.com/Dgoat724236/Discord-Meme-Generator');
            helpEmbed.setAuthor(client.user.username, client.user.avatarURL(), 'https://github.com/Dgoat724236/Discord-Meme-Generator');
            helpEmbed.setDescription('How to use the "ping" command');
            helpEmbed.setThumbnail('https://media.giphy.com/media/lkdH8FmImcGoylv3t3/giphy.gif');
            helpEmbed.addField(config.prefix + 'ping', 'This will return the time it takes for the bot to receive a message. It will be in the format "<@' + msg.author + '>, pong! This took __ ms.".', false)
            helpEmbed.setTimestamp();
            helpEmbed.setFooter('If I break, please make an issue on the GitHub!');
        } else if (args[0] === 'meme') {
            helpEmbed.setColor('#13613A');
            helpEmbed.setTitle('Meme Generator Help: Meme Command');
            helpEmbed.setURL('https://github.com/Dgoat724236/Discord-Meme-Generator');
            helpEmbed.setAuthor(client.user.username, client.user.avatarURL(), 'https://github.com/Dgoat724236/Discord-Meme-Generator');
            helpEmbed.setDescription('How to use the "meme" command');
            helpEmbed.setThumbnail('https://media.giphy.com/media/lkdH8FmImcGoylv3t3/giphy.gif');
            helpEmbed.addField(config.prefix + '', 'TODO', false)
            helpEmbed.setTimestamp();
            helpEmbed.setFooter('If I break, please make an issue on the GitHub!');
        }
        else {
            helpEmbed.setColor('#13613A');
            helpEmbed.setTitle('Meme Generator Help');
            helpEmbed.setURL('https://github.com/Dgoat724236/Discord-Meme-Generator');
            helpEmbed.setAuthor(client.user.username, client.user.avatarURL(), 'https://github.com/Dgoat724236/Discord-Meme-Generator');
            helpEmbed.setDescription('How to use this bot');
            helpEmbed.setThumbnail('https://media.giphy.com/media/lkdH8FmImcGoylv3t3/giphy.gif');
            helpEmbed.addFields(
                {name: config.prefix + 'ping', value: 'This will return the time it takes for the bot to receive a message. It will be in the format "<@' + msg.author + '>, pong! This took __ ms.".', inline: true },
                {name: config.prefix + 'meme [image] [text] [textpos] [effect]', value: 'TODO', inline: true}
            )
            helpEmbed.setTimestamp();
            helpEmbed.setFooter('If I break, please make an issue on the GitHub!');
        }
        msg.reply(helpEmbed);
    },
    meme: function (msg, client, handler, args) {

        // Embeds
        const imageEmbed = new Discord.MessageEmbed()
            .setColor('#13613A')
            .setTitle('Meme Generator: Meme Setup')
            .setURL('https://github.com/Dgoat724236/Discord-Meme-Generator')
            .setAuthor(client.user.username, client.user.avatarURL(), 'https://github.com/Dgoat724236/Discord-Meme-Generator')
            .setDescription('Step 1: Image (<@' + msg.author + '>)')
            .setThumbnail('https://media.giphy.com/media/xRJZH4Ajr973y/giphy.gif')
            .addField('Submit an image', 'Please submit an image in a message. Feel free to use any image format, and either a url or a file. You have 60 seconds to submit something.', true)
            .setTimestamp()
            .setFooter('If I break, please make an issue on the GitHub!');
        const textEmbed = new Discord.MessageEmbed()
            .setColor('#13613A')
            .setTitle('Meme Generator: Meme Setup')
            .setURL('https://github.com/Dgoat724236/Discord-Meme-Generator')
            .setAuthor(client.user.username, client.user.avatarURL(), 'https://github.com/Dgoat724236/Discord-Meme-Generator')
            .setDescription('Step 2: Text (<@' + msg.author + '>)')
            .setThumbnail('https://media.giphy.com/media/xRJZH4Ajr973y/giphy.gif')
            .addField('Submit text', 'Please submit a string of text that will be placed on the image. You have 60 seconds to submit text.', true)
            .setTimestamp()
            .setFooter('If I break, please make an issue on the GitHub!');
        const textPosEmbed = new Discord.MessageEmbed()
            .setColor('#13613A')
            .setTitle('Meme Generator: Meme Setup')
            .setURL('https://github.com/Dgoat724236/Discord-Meme-Generator')
            .setAuthor(client.user.username, client.user.avatarURL(), 'https://github.com/Dgoat724236/Discord-Meme-Generator')
            .setDescription('Step 3: Text Position (<@' + msg.author + '>)')
            .setThumbnail('https://media.giphy.com/media/xRJZH4Ajr973y/giphy.gif')
            .addFields(
                { name: 'React to this message', value: 'Please react to this message with the position you want the text to be located in.', inline: true },
                { name: 'Diagram', value: ':arrow_upper_left::arrow_up::arrow_upper_right:\n:arrow_left::record_button::arrow_right:\n:arrow_lower_left::arrow_down::arrow_lower_right:', inline: true },
            )
            .setTimestamp()
            .setFooter('If I break, please make an issue on the GitHub!');
        const effectEmbed = new Discord.MessageEmbed()
            .setColor('#13613A')
            .setTitle('Meme Generator: Meme Setup')
            .setURL('https://github.com/Dgoat724236/Discord-Meme-Generator')
            .setAuthor(client.user.username, client.user.avatarURL(), 'https://github.com/Dgoat724236/Discord-Meme-Generator')
            .setDescription('Step 4: Effects (<@' + msg.author + '>)')
            .setThumbnail('https://media.giphy.com/media/xRJZH4Ajr973y/giphy.gif')
            .addFields(
                { name: 'React to this message', value: 'Please react to this message with the effect you would like applied to the gif.', inline: true },
                { name: 'Options', value: ':x: None\n:sparkles: Sparkles\n:black_square_button: Black & White', inline: true },
            )
            .setTimestamp()
            .setFooter('If I break, please make an issue on the GitHub!');
        const loadingEmbed = new Discord.MessageEmbed()
            .setColor('#13613A')
            .setDescription("Loading...");

        //Variables
        var step1;
        var step2;
        var step3;
        var step4;

        var botMessage;
        var imageMessage

        //Functions

        async function getImageEmbed(message) {

            var botMessage;

            let filter = m => message.author.id === m.author.id;
            message.channel.send(imageEmbed).then(m => {
                botMessage = m;
                message.channel.awaitMessages(filter, {
                    time: 60000,
                    max: 1,
                    errors: ['time']
                })
                    .then(messages => {
                        imageMessage = messages.first()
                        if (imageMessage.attachments.size > 0) {
                            imageMessage.attachments.forEach(Attachment => {
                                step1 = Attachment.url;
                                console.log(step1);
                                botMessage.delete();
                                // newMessage.delete();
                                getTextEmbed(message);
                            })
                        } else {
                            step1 = imageMessage.content;
                            console.log(step1);
                            botMessage.delete();
                            // newMessage.delete();
                            getTextEmbed(message);
                        }
                    })
                    .catch(() => {
                        botMessage.delete();
                        message.channel.send(`No input received.`);
                    });
            });
        }

        async function getTextEmbed(message) {

            var botMessage;

            let filter = m => message.author.id === m.author.id;
            message.channel.send(textEmbed).then(m => {
                botMessage = m;
                message.channel.awaitMessages(filter, {
                    time: 60000,
                    max: 1,
                    errors: ['time']
                })
                    .then(messages => {
                        newMessage = messages.first()
                        if (newMessage.content.length > 0) {
                            step2 = newMessage.content;
                            console.log(step2);
                            botMessage.delete();
                            newMessage.delete();
                            getTextPosEmbed(message, handler);
                            return;
                        }
                    })
                    .catch(() => {
                        botMessage.delete();
                        message.channel.send(`No input received.`);
                    });
            });
        }

        async function getTextPosEmbed(message, handler) {

            var botMessage;

            const buttons = [
                {
                    emoji: '↖',
                    run: () => {
                        step3 = 'topleft';
                        console.log(step3);
                        botMessage.delete();
                        getEffectEmbed(message, handler)
                    }
                },
                {
                    emoji: '⬆',
                    run: () => {
                        step3 = 'top';
                        console.log(step3);
                        botMessage.delete();
                        getEffectEmbed(message, handler)
                    }
                },
                {
                    emoji: '↗️',
                    run: () => {
                        step3 = 'topright';
                        console.log(step3);
                        botMessage.delete();
                        getEffectEmbed(message, handler)
                    }
                },
                {
                    emoji: '⬅',
                    run: () => {
                        step3 = 'left';
                        console.log(step3);
                        botMessage.delete();
                        getEffectEmbed(message, handler)
                    }
                },
                {
                    emoji: '⏺',
                    run: () => {
                        step3 = 'center';
                        console.log(step3);
                        botMessage.delete();
                        getEffectEmbed(message, handler)
                    }
                },
                {
                    emoji: '➡',
                    run: () => {
                        step3 = 'right';
                        console.log(step3);
                        botMessage.delete();
                        getEffectEmbed(message, handler)
                    }
                },
                {
                    emoji: '↙️',
                    run: () => {
                        step3 = 'bottomleft';
                        console.log(step3);
                        botMessage.delete();
                        getEffectEmbed(message, handler)
                    }
                },
                {
                    emoji: '⬇️',
                    run: () => {
                        step3 = 'bottom';
                        console.log(step3);
                        botMessage.delete();
                        getEffectEmbed(message, handler)
                    }
                },
                {
                    emoji: '↘️',
                    run: () => {
                        step3 = 'bottomright';
                        console.log(step3);
                        botMessage.delete();
                        getEffectEmbed(message, handler)
                    }
                }
            ]

            let getTextPosMenu = new RC.Menu(textPosEmbed, buttons, { owner: message.author.id });
            handler.addMenus(getTextPosMenu);
            message.channel.send(typeof getTextPosMenu.text === 'string' ? getTextPosMenu.text : { embed: getTextPosMenu.text }).then(async m => {
                botMessage = m;
                for (let button in getTextPosMenu.buttons) {
                    await m.react(button).catch(console.error)
                }
                getTextPosMenu.register(m)
            })
        }

        async function getEffectEmbed(message, handler) {

            var botMessage;

            const buttons = [
                {
                    emoji: '❌',
                    run: () => {
                        step4 = 'none';
                        console.log(step4);
                        botMessage.delete();
                        compileImage(message)
                    }
                },
                {
                    emoji: '✨',
                    run: () => {
                        step4 = 'sparkle';
                        console.log(step4);
                        botMessage.delete();
                        compileImage(message)
                    }
                },
                {
                    emoji: '🔲',
                    run: () => {
                        step4 = 'blackandwhite';
                        console.log(step4);
                        botMessage.delete();
                        compileImage(message)
                    }
                }
            ]

            let getEmbed = new RC.Menu(effectEmbed, buttons, { owner: message.author.id });
            handler.addMenus(getEmbed);
            message.channel.send(typeof getEmbed.text === 'string' ? getEmbed.text : { embed: getEmbed.text }).then(async m => {
                botMessage = m;
                for (let button in getEmbed.buttons) {
                    await m.react(button).catch(console.error)
                }
                getEmbed.register(m)
            })
        }

        async function compileImage(message) {

            var botMessage;

            message.channel.send(loadingEmbed).then(m => {
                botMessage = m;
            });

            function get_url_extension(url) {
                return url.split(/[#?]/)[0].split('.').pop().trim();
            }

            const url = step1;
            const id = Math.floor(1000 + Math.random() * 9000);
            const path = "./images/";
            const filename = 'image' + id + '.' + get_url_extension(url);

            const download = (url, path, callback) => {
                request.head(url, (err, res, body) => {
                    request(url)
                        .pipe(fs.createWriteStream(path))
                        .on('close', callback)
                })
            }

            download(url, path + filename, () => {
                console.log('✅ Done!')
                step1 = path + filename;
                console.log(step1);
                drawImage(message);
            })

            async function drawImage(message) {

                // Setup picture as background

                var dimensions = sizeOf(step1);

                const canvas = Canvas.createCanvas(dimensions.width, dimensions.height);
                const ctx = canvas.getContext('2d');

                const background = await Canvas.loadImage(step1);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

                // Add text in correct position

                // Apply any effects

                // Send message

                imageMessage.delete();
                
                const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'finished' + id + '.' + get_url_extension(url));
                message.channel.send(attachment);

                botMessage.delete();

                try {
                    fs.unlinkSync(step1)
                } catch (err) {
                    console.error(err)
                }
            }
        }

        //Start everything
        getImageEmbed(msg);
    }
}
*/