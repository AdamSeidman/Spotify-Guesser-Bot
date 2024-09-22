/**
 * Main entry point for spotify bot.
 * 
 * Author: Adam Seidman
 */

const config = require('./config')
const Discord = require('discord.js')
const spotify = require('../base/spotify')
const commands = require('../base/commands')
const game = require('../base/game')
const reqHandling = require('../base/reqHandling')

const bot = new Discord.Client({
    intents: config.discord.intents,
    partials: config.discord.partials
})
bot.login(config.discord.token)

bot.on('ready', async () => {
    spotify.start()
    await commands.registerSlashCommands(bot)
    await game.initGames()
    console.log('Bot Initialized.')
})

bot.on('messageCreate', async msg => {
    if (msg.member === null && !msg.author.bot) {
        console.log(`DM (${msg.author.username}): ${msg.content}`)
    }
    else if (!msg.author.bot) {
        reqHandling.enqueueRequest(msg.guild.id, commands.processMessage, msg)
    }
})

bot.on('interactionCreate', interaction => {
    if (interaction.member === null) {
        interaction.reply('Interactions/Commands are only available within servers.')
    }
    else if ( interaction.isButton() ) {
        commands.handleButtonPress(interaction)
    }
    else if ( interaction.isChatInputCommand() ) {
        commands.handleSlashCommand(interaction)
    }
})

bot.on('error', console.error)
