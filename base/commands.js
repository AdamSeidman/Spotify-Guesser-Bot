/**
 * All game commands.
 * 
 * Author: Adam Seidman
 */

const games = require('./game')
const spotify = require('./spotify')
const Discord = require('discord.js')
const config = require('../client/config')

var getDetails = function(msg) {
    let game = games.getGame(msg.guild.id)
    if (game === undefined) {
        msg.reply('There is no game in progress!')
    }

    let track = game.currentTrack
    let trackNum = msg.options.getInteger('track', false)
    if (trackNum) {
        let ret = games.getTrack(game.key, trackNum)
        if (ret) track = ret
    }
    if (track === undefined) {
        msg.reply('Error! Could not find details.')
        return
    }

    let minutes = Math.floor(track.duration / (1000 * 60))
    let seconds = Math.round(track.duration / 1000) % 60
    if ( seconds < 10 ) {
        seconds = `0${seconds}`
    }
    let fields = [
        //{name: 'Artist', value: track.artist },
        {name: 'Album', value: (track.album || '_(Single)_')},
        {name: 'Duration', value: `${minutes}:${seconds}`}
    ]
    if (track.memberId) {
        fields.unshift({
            name: 'Submitted by',
            value: `<@${track.memberId}>`
        })
    }
    let detailsEmbed = new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(track.name)
        .setURL(track.url)
        .setDescription(`*${track.artist}*`)
        .addFields(...fields)
        .setThumbnail(track.images[0].url)
        .setFooter({text: `Released: ${track.releaseDate}`})
    msg.reply({embeds: [detailsEmbed]})
}

var startGame = async function(msg) {
    let game = games.getGame(msg.guild.id)
    if (game !== undefined) {
        msg.reply('This server already has an active game!')
        return
    }
    let track = await games.createGame(msg)
    msg.reply(`Start the game with \`${track.full}\` (next word \`${track.name.toLowerCase().split(' ').slice(-1)[0]}\`).`)
}

var processMessage = async function(msg) {
    if (msg.content.trim().startsWith(config.options.defaultCommandPrefix)) {
        let game = games.getGame(msg.guild.id)
        if (game === undefined || game.channelId !== msg.channel.id) return
        let track = msg.content.substring(msg.content.toLowerCase().indexOf(
            config.options.defaultCommandPrefix.toLowerCase()) + config.options.defaultCommandPrefix.length).trim()
        if (track === undefined || track.length < 1) return
        track = await spotify.getTrack(track)
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

var showHistory = function(msg) {
    let history = games.getHistory(msg.guild.id)
    if (history === undefined || history.list === undefined || history.list.length < 1) {
        msg.reply({content: 'Could not find game history within this server.', ephemeral: true})
        return
    }
    let fields = history.list.map((el, index) => {
        return `**${index})**  ${el.full} (<@${el.memberId}>)`
    })
    fields.shift()
    let historyEmbed = new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(`Current Game History for ${msg.guild.name}`)
        .setDescription(`Started with:  ${history.list[0].full}\n\n${fields.join('\n')}`)
        .setThumbnail(msg.guild.iconURL())
        .setTimestamp()
    msg.reply({embeds: [historyEmbed]})
}

var shuffleWord = function(msg) {
    games.shuffle(msg)
}

const slashCommands = [
    {
        phrase: 'start',
        data: new Discord.SlashCommandBuilder().setName('start').setDescription('Start new chain!'),
        execute: startGame
    },
    {
        phrase: 'details',
        data: new Discord.SlashCommandBuilder().setName('details').setDescription('Get most recent song description.')
            .addIntegerOption(opt => opt.setName('track').setDescription('Track number to get details of.').setMinValue(0).setRequired(false)),
        execute: getDetails
    },
    {
        phrase: 'history',
        data: new Discord.SlashCommandBuilder().setName('history').setDescription('See history of current game.'),
        execute: showHistory
    },
    {
        phrase: 'shuffle',
        data: new Discord.SlashCommandBuilder().setName('shuffle').setDescription('Shuffle first word of the game.'),
        execute: shuffleWord
    }
]

var registerSlashCommands = function(client) {
    if (client === undefined) {
        console.error('No client in registerSlashCommands!')
        return
    }

    client.commands = new Discord.Collection()
    const commands = []
    slashCommands.forEach(command => {
        client.commands.set(command.phrase, command)
        commands.push(command.data.toJSON())
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
