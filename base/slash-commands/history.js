/**
 * Show history of the current game.
 * 
 * Author: Adam Seidman
 */

const games = require('../game')
const Discord = require('discord.js')
const config = require('../../client/config')

var showHistory = function(interaction) {
    let history = games.getHistory(interaction.guild.id)
    if (history === undefined || history.list === undefined || history.list.length < 1) {
        interaction.reply({content: 'Could not find game history within this server.', ephemeral: true})
        return
    }
    let fields = history.list.map((el, index) => {
        return `**${index})**  ${el.full} (<@${el.memberId}>)`
    })
    fields.shift()
    let historyEmbed = new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(`Current Game History for ${interaction.guild.name}`)
        .setDescription(`Started with:  ${history.list[0].full}\n\n${fields.join('\n')}`)
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp()
    interaction.reply({embeds: [historyEmbed]})
}

module.exports = {
    phrase: 'history',
    data: new Discord.SlashCommandBuilder().setName('history').setDescription('See history of current game.'),
    execute: showHistory
}
