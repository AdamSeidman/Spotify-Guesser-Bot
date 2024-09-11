/**
 * Get details of a guessed song.
 * 
 * Author: Adam Seidman
 */

const games = require('../game')
const Discord = require('discord.js')
const config = require('../../client/config')

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

module.exports = {
    phrase: 'details',
    data: new Discord.SlashCommandBuilder()
        .setName('details')
        .setDescription('Get most recent song description.')
        .addIntegerOption(opt => 
            opt
                .setName('track')
                .setDescription('Track number to get details of.')
                .setMinValue(0)
                .setRequired(false)
        ),
    execute: getDetails
}
