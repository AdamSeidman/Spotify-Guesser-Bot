/**
 * Get the amount of time the bot has been alive
 * 
 * Author: Adam Seidman
 */

const Discord = require('discord.js')
const config = require('../../client/config')
const { hideOption, getHideResult } = require('../helpers')

const startDate = new Date()

const uptimeString = () => {
    let interval = Math.floor((new Date() - startDate) / 1000) / 31536000
    let ret = []
    let checkAndPush = str => {
        if ( interval <= 1 ) return
        ret.push( Math.floor(interval) )
        ret.push( str )
        if (ret[ret.length - 2] == 1) {
            ret[ret.length - 1] = ret[ret.length - 1].slice(0, -1)
        }
        interval %= 1.0
    }
    checkAndPush( 'years' )
    interval *= 12
    checkAndPush( 'months' )
    interval *= 30
    checkAndPush( 'days' )
    interval *= 24
    checkAndPush( 'hours' )
    interval *= 60
    checkAndPush( 'minutes' )
    interval *= 60
    checkAndPush( 'seconds' )
    if ( ret.length > 6 ) {
        ret = ret.slice(0, 6)
    }
    if ( ret.length < 1 ) {
        ret = ['<1 second']
    }
    return ret.join(' ')
}

module.exports = {
    phrase: 'uptime',
    data: new Discord.SlashCommandBuilder()
        .setName('uptime')
        .setDescription('How long has the bot been up?')
        .addStringOption(hideOption),
    execute: interaction => {
        let embed = new Discord.EmbedBuilder()
            .setColor(config.options.embedColor)
            .setTitle('Bot Uptime')
            .setDescription(uptimeString())
            .setTimestamp()
        interaction.reply({ embeds: [embed], ephemeral: getHideResult(interaction) })
    },
    immediate: true
}
