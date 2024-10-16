/**
 * Main entry point for spotify bot.
 * 
 * Author: Adam Seidman
 */

const config = require('./config')
const log = require('../base/log')
const game = require('../base/game')
const Discord = require('discord.js')
const spotify = require('../base/spotify')
const commands = require('../base/commands')
const { strip } = require('../base/helpers')
const reqHandling = require('../base/reqHandling')

const bot = new Discord.Client({
    intents: config.discord.intents,
    partials: config.discord.partials
})
bot.login(config.discord.token)

bot.on('ready', async () => {
    log.init()
    spotify.start()
    await commands.registerSlashCommands(bot)
    await game.initGames()
    log.info('Bot Initialized.', 'onReady', true)
})

bot.on('messageCreate', async msg => {
    if (msg.member === null && !msg.author.bot) {
        log.info(`DM (${msg.author.username}): ${msg.content}`)
    }
    else if (!msg.author.bot) {
        if (config.discord.adminId !== undefined && msg.member.id == config.discord.adminId && typeof config.options.adminRestartPhrase === 'string') {
            if (strip(msg.content.toLowerCase()).split(' ').join('') === config.options.adminRestartPhrase.toLowerCase()) {
                log.info('Restart Requested', config.options.adminRestartPhrase)
                process.exit()
            }
        }
        reqHandling.enqueueRequest(msg.guild.id, commands.processMessage, msg)
    }
})

bot.on('guildCreate', guild => {
    if (guild === undefined) return
    log.info('Added to server!', guild.name, true)
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
    else if ( interaction.isStringSelectMenu() ) {
        commands.handleStringSelect(interaction)
    }
    else {
        log.warn(`Unknown interaction created by ${interaction.member.id}`, interaction.guild.id, true)
    }
})

bot.on('error', log.error)

module.exports = { client: bot }
