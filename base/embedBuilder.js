/**
 * Create re-usable embeds.
 * 
 * Author: Adam Seidman
 */

const Discord = require('discord.js')
const config = require('../client/config')

const trackDetailsEmbed = track => {
    if (track === undefined) return
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
    return new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(track.name)
        .setURL(track.url)
        .setDescription(`*${track.artist}*`)
        .addFields(...fields)
        .setThumbnail(track.images[0].url)
        .setFooter({text: `Released: ${track.releaseDate}`})
}

module.exports = {
    trackDetailsEmbed
}