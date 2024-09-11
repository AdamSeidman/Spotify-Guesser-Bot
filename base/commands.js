/**
 * All game commands.
 * 
 * Author: Adam Seidman
 */

const fs = require('fs')
const path = require('path')
const games = require('./game')
const spotify = require('./spotify')
const Discord = require('discord.js')
const config = require('../client/config')

const CMD_DIR = 'slash-commands'

var processMessage = async function(msg) {
    if (msg.content.trim().startsWith(config.options.defaultCommandPrefix)) {
        let game = games.getGame(msg.guild.id)
        if (game === undefined || game.channelId !== msg.channel.id) return
        let track = msg.content.substring(msg.content.toLowerCase().indexOf(
            config.options.defaultCommandPrefix.toLowerCase()) + config.options.defaultCommandPrefix.length).trim()
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

var registerSlashCommands = function(client) {
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

var handleSlashCommand = async function(interaction) {
    const command = interaction.client.commands.get(interaction.commandName)

    if (!command) {
        console.error(`Requested slash command not found: ${command}`)
        interaction.reply({content: 'Internal Error! Command not found.', ephemeral: true})
        return
    }

    try {
        command.execute(interaction)
    } catch (err) {
        console.error('Error executing command interaction!', err)
        interaction.reply({content: 'Could not execute command!', ephemeral: true})
    }
}

module.exports = {
    processMessage,
    registerSlashCommands,
    handleSlashCommand,
}
