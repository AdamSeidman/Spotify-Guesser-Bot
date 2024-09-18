/**
 * Create re-usable embeds.
 * 
 * Author: Adam Seidman
 */

const Discord = require('discord.js')
const config = require('../client/config')
const { copyObject, escapeDiscordString } = require('./helpers')

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
            value: `<@${track.memberId}>`
        })
    }
    return new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(escapeDiscordString(track.name))
        .setURL(track.url)
        .setDescription(`*${escapeDiscordString(track.artist)}*`)
        .addFields(...fields)
        .setThumbnail(track.images[0].url)
        .setFooter({text: `Released: ${track.releaseDate}`})
}

const historyEmbed = (game, title, guild, footerText, timestamp) => {
    let fields = game.list.map((el, index) => {
        return `**${index}**)  ` + escapeDiscordString(`${el.full} (<@${el.memberId}>)`)
    })
    fields.shift()
    if (footerText) {
        fields.push(footerText)
    }
    let embed = new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(title)
        .setDescription(`Started with:  ${escapeDiscordString(game.list[0].full)}\n\n${fields.join('\n')}`)
        .setThumbnail(guild.iconURL())
    if (timestamp) {
        embed.setTimestamp()
    }
    if (guild) {
        embed.setThumbnail(guild.iconURL())
    }
    return embed
}

const leaderboardCache = []

const newLeaderboardEmbed = (title, valueArray) => {
    let desc = []
    let values = copyObject(valueArray)
    leaderboardCache.push({title, list: valueArray})
    while (values.length > 0 && desc.length < config.options.maxLeaderboardSlots) {
        let item = values.shift()
        let key = Object.keys(item)[0]
        desc.push(`${desc.length + 1}. ${key} - **${item[key]}**`)
    }
    return { embed: new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(title)
        .setDescription(desc.join('\n')),
    idx: (leaderboardCache.length - 1) }
}

const cachedLeaderboardEmbed = (cachedVal, startVal) => {
    if (cachedVal === undefined || cachedVal < 0 || cachedVal >= leaderboardCache.length) return
    let desc = []
    let values = copyObject(leaderboardCache[cachedVal].list).slice(startVal)
    while (values.length > 0 && desc.length < config.options.maxLeaderboardSlots) {
        let item = values.shift()
        let key = Object.keys(item)[0]
        desc.push(`${desc.length + 1 + startVal}. ${key} - **${item[key]}**`)
    }
    return new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(leaderboardCache[cachedVal].title)
        .setDescription(desc.join('\n'))
}

module.exports = {
    trackDetailsEmbed,
    historyEmbed,
    newLeaderboardEmbed,
    cachedLeaderboardEmbed
}
