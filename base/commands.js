/**
 * All game commands.
 * 
 * Author: Adam Seidman
 */

const fs = require('fs')
const db = require('./db')
const path = require('path')
const games = require('./game')
const spotify = require('./spotify')
const Discord = require('discord.js')
const config = require('../client/config')
const reqHandling = require('./reqHandling')

const CMD_DIR = 'slash-commands'
var buttonHooks = {}
var buttonActionHooks = {}

const processMessage = async msg => {
    let rules = await db.getServerRules(msg.guild.id)
    if (msg.content.trim().startsWith(rules.prefix)) {
        let game = games.getGame(msg.guild.id)
        if (game === undefined || game.channelId !== msg.channel.id) return
        let track = msg.content.substring(msg.content.toLowerCase().indexOf(
            rules.prefix.toLowerCase()) + rules.prefix.length).trim()
        if (track === undefined || track.length < 1) return
        let trackByArtist = await spotify.getTrackByArtist(track)
        if (trackByArtist === undefined) {
            track = await spotify.getTrack(track)
        }
        else {
            track = trackByArtist
        }
        let res = await games.guess(msg, track)
        if (res === undefined) {
            msg.react('✅')
            msg.react('🎵')
        }
        else {
            msg.react('❌')
            track = await games.createGame(msg)
            msg.reply(`${res[0]} Start again from \`${track.full}\` (next word \`${track.name.toLowerCase().split(' ').slice(-1)[0]}\`). ${res[1]}`)
        }
    }
}

const registerSlashCommands = client => {
    if (client === undefined) {
        console.error('No client in registerSlashCommands!')
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
            if (cmd.btnActionHandler !== undefined) {
                buttonActionHooks[cmd.phrase] = cmd.btnActionHandler
            }
        }
    })

    const rest = new Discord.REST().setToken(config.token)

    try {
        console.log(`Refreshing ${commands.length} slash commands.`)
        rest.put(Discord.Routes.applicationCommands(config.botId), {body: commands})
    } catch (err) {
        console.error('Could not deploy slash commands!', err)
    }
    console.log('Finished reloading slash commands.')
}

const queuedCommand = async interaction => {
    try {
        interaction.client.commands.get(interaction.commandName).execute(interaction)
    } catch (err) {
        console.error('Error executing command interaction!', err)
        interaction.reply({content: 'Could not execute command!', ephemeral: true})
    }
}

const handleSlashCommand = async interaction => {
    const command = interaction.client.commands.get(interaction.commandName)

    if (!command) {
        console.error(`Requested slash command not found: ${command}`)
        interaction.reply({content: 'Internal Error! Command not found.', ephemeral: true})
        return
    }

    if (command.immedate) {
        command.execute(interaction)
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
        await buttonActionHooks[action](interaction)
    }
    else {
        interaction.reply({content: 'Could not complete button press request!', ephemeral: true})
    }
}

module.exports = {
    processMessage,
    registerSlashCommands,
    handleSlashCommand,
    handleButtonPress
}
