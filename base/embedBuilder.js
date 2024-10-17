/**
 * Create re-usable embeds.
 * 
 * Author: Adam Seidman
 */

const Discord = require('discord.js')
const config = require('../client/config')
const { escapeDiscordString } = require('./helpers')

const trackDetailsEmbed = track => {
    if (track === undefined) return
    let minutes = Math.floor(track.duration / (1000 * 60))
    let seconds = Math.round(track.duration / 1000) % 60
    if ( seconds < 10 ) {
        seconds = `0${seconds}`
    }
    let fields = [
        {name: 'Album', value: (track.album === undefined)? '_(Single)_' : escapeDiscordString(track.album)},
        {name: 'Duration', value: `${minutes}:${seconds}`}
    ]
    if (track.memberId) {
        fields.unshift({
            name: 'Submitted by',
            value: Discord.userMention(track.memberId)
        })
    }
    let artist = `*${escapeDiscordString(track.artist)}*`
    if (track.fullArtistList !== undefined) {
        artist = track.fullArtistList.join(', ')
    }
    return new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(escapeDiscordString(track.name))
        .setURL(track.url)
        .setDescription(artist)
        .addFields(...fields)
        .setThumbnail(track.images[0].url)
        .setFooter({text: `Released: ${track.releaseDate}`})
}

module.exports = {
    trackDetailsEmbed
}
