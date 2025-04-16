/**
 * All game commands.
 * 
 * Author: Adam Seidman
 */

const fs = require('fs')
const db = require('./db')
const log = require('./log')
const path = require('path')
const games = require('./game')
const spotify = require('./spotify')
const Discord = require('discord.js')
const config = require('../client/config')
const reqHandling = require('./reqHandling')
const { strip } = require('./helpers')

const CMD_DIR = 'slash-commands'
var buttonHooks = {}
var buttonActionHooks = {}
var dropdownHooks = {}

const MAX_QUERY_LENGTH = 100

const processMessage = async msg => {
    let rules = await db.getServerRules(msg.guild.id)
    if (msg.content.trim().startsWith(rules.prefix)) {
        let res = ['', '']
        let track = undefined
        if (msg.content.trim().length <= (MAX_QUERY_LENGTH  + rules.prefix.length)) {
            let game = games.getGame(msg.guild.id)
            if (game === undefined || game.channelId !== msg.channel.id) return
            track = msg.content.substring(msg.content.toLowerCase().indexOf(
                rules.prefix.toLowerCase()) + rules.prefix.length).trim()
            if (track === undefined || track.length < 1) return
    
            let resultingTrack = undefined
            if ( !rules['artist-required'] ) {
                resultingTrack = await spotify.getTrack(track, true)
            }
            if ( resultingTrack === undefined ) {
                resultingTrack = await spotify.getTrackByArtist(track)
            }
            if ( resultingTrack === undefined && !rules['artist-required'] ) {
                resultingTrack = await spotify.getTrack(track)
            }
            track = resultingTrack
            res = await games.guess(msg, track)
        } else {
            res = await games.guess(msg, 0, true)
        }
        if (res === undefined) {
            await msg.react('✅')
            await msg.react('🎵')
            let hasChar = msg.content.includes('-') || msg.content.trim().slice(-1) != strip(msg.content).slice(-1)
            if (hasChar && reqHandling.peekLength(msg.guild.id) === 1) {
                msg.channel.send(`The next word is \`${
                    strip(track.name.split(' ').slice(-1)[0].toLowerCase())
                }\`.`)
            }
        }
        else {
            await msg.react('❌')
            track = await games.createGame(msg)
            msg.reply(`${res[0]} Start again from \`${track.full}\` (next word \`${track.name.toLowerCase().split(' ').slice(-1)[0]}\`). ${res[1]}`)
        }
    }
}

const registerSlashCommands = client => {
    if (client === undefined) {
        log.error('No client in registerSlashCommands!', client, null, true)
        return
    }

    var commandFiles = []
    const commands = []

    fs.readdirSync(path.join(__dirname, CMD_DIR)).forEach(file => {
        if (path.extname(file) == '.js') {
            commandFiles.push(`./${CMD_DIR}/${file.slice(0, file.indexOf('.'))}`)
        }
    })

    client.commands = new Discord.Collection()
    commandFiles.forEach(cmdFile => {
        let cmd = require(cmdFile)
        if (cmd.execute !== undefined) {
            client.commands.set(cmd.phrase, cmd)
            commands.push(cmd.data.toJSON())
            if (cmd.buttons !== undefined) {
                cmd.buttons.forEach(x => {
                    buttonHooks[x.btn.data.custom_id] = x
                })
            }
            if (cmd.dropdownHook !== undefined) {
                dropdownHooks[cmd.phrase] = cmd.dropdownHook
            }
            if (cmd.btnActionHandler !== undefined) {
                buttonActionHooks[cmd.phrase] = cmd.btnActionHandler
            }
        }
    })

    const rest = new Discord.REST().setToken(config.discord.token)

    try {
        log.info(`Refreshing ${commands.length} slash commands.`)
        rest.put(Discord.Routes.applicationCommands(config.discord.botId), {body: commands})
    } catch (err) {
        log.error('Could not deploy slash commands', null, err, true)
    }
}

const queuedCommand = async interaction => {
    try {
        interaction.client.commands.get(interaction.commandName).execute(interaction)
    } catch (err) {
        log.error('Error executing command interaction!', interaction.commandName, err, true)
        interaction.reply({content: 'Could not execute command!', ephemeral: true})
    }
}

const handleSlashCommand = async interaction => {
    const command = interaction.client.commands.get(interaction.commandName)

    if (!command) {
        log.error('Requested slash command not found', command, `${interaction.guild.name}-${interaction.member.name}`, true)
        interaction.reply({content: 'Internal Error! Command not found.', ephemeral: true})
        return
    }

    if (command.immedate) {
        try {
            command.execute(interaction)
        }
        catch (err) {
            log.error('Highest level slash command error!', interaction.commandName, err, true)
        }
    } else {
        reqHandling.enqueueRequest(interaction.guild.id, queuedCommand, interaction)
    }
}

const handleButtonPress = async interaction => {
    let hook = buttonHooks[interaction.customId]
    let action = interaction.customId.split('_')[0]

    if (hook) {
        if (action.toLowerCase().startsWith('challenge') && reqHandling.peekLength(interaction.guild.id) >= 1) {
            interaction.reply({ content: 'The challenged guess is no longer current.', ephemeral: true })
        } else {
            reqHandling.enqueueRequest(interaction.guild.id, hook.execute, interaction)
        }
    }
    else if (Object.keys(buttonActionHooks).includes(action)) {
        try {
            await buttonActionHooks[action](interaction)
        }
        catch (err) {
            log.error('Highest level button press error!', action, err, true)
        }
    }
    else {
        interaction.reply({content: 'Could not complete button press request!', ephemeral: true})
        log.error('Could not complete button press.', action)
    }
}

const handleStringSelect = async interaction => {
    let parts = interaction.customId.split('_')
    let hook = dropdownHooks[parts[0]]

    if ( hook === undefined ) {
        interaction.reply({content: 'Could not complete request!', ephemeral: true})
        log.error('Could not complete dropdown change', parts)
    }
    else {
        try {
            hook(interaction, parts.slice(1))
        }
        catch (err) {
            log.error('Highest level string select error!', interaction.customId, err, true)
        }
    }
}

module.exports = {
    processMessage,
    registerSlashCommands,
    handleSlashCommand,
    handleButtonPress,
    handleStringSelect
}
