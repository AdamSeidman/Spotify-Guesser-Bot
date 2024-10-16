/**
 * Get time to ping the bot.
 * 
 * Author: Adam Seidman
 */

const Discord = require('discord.js')
const config = require('../../client/config')
const { hideOption, getHideResult } = require('../helpers')

module.exports = {
    phrase: 'ping',
    data: new Discord.SlashCommandBuilder()
        .setName('ping')
        .setDescription('Get current bot latency.')
        .addStringOption(hideOption),
    execute: interaction => {
        let time = Date.now() - interaction.createdTimestamp
        if ( time < 1 ) {
            time = '<1'
        }
        let embed = new Discord.EmbedBuilder()
            .setColor(config.options.embedColor)
            .setTitle('Ping Time')
            .setDescription(`Latency is ${time} ms.`)
            .setTimestamp()
        interaction.reply({ embeds: [embed], ephemeral: getHideResult(interaction) })
    },
    immediate: true
}
