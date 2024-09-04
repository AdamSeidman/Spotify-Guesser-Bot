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

const bot = new Discord.Client({
    intents: config.intents,
    partials: config.partials
})
bot.login(config.token)

bot.on('ready', async () => {
    spotify.start()
    await commands.registerSlashCommands(bot)
    await game.initGames()
    console.log('Bot Initialized.')
})

bot.on('messageCreate', async msg => {
    if (!msg.author.bot) {
        commands.processMessage(msg)
    }
})

bot.on('interactionCreate', interaction => {
    if (!interaction.isChatInputCommand()) return
    commands.handleSlashCommand(interaction)
})

bot.on('error', console.error)
