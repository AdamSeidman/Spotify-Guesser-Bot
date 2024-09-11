/**
 * Display information about this bot.
 * 
 * Author: Adam Seidman
 */

const Discord = require('discord.js')
const config = require('../../client/config')

module.exports = {
    phrase: 'about',
    data: new Discord.SlashCommandBuilder()
        .setName('about')
        .setDescription('See information about the bot.'),
    execute: interaction => {
        let embed = new Discord.EmbedBuilder()
            .setColor(config.options.embedColor)
            .setTitle('About Song Chains Bot')
            .setFields({
                name: 'GitHub Repository',
                value: '[GitHub](https://github.com/AdamSeidman/Spotify-Guesser-Bot)'
            }, {
                name: 'Copyright',
                value: '© 2024 Adam Seidman'
            })
            .setTimestamp()
        interaction.reply({ embeds: [embed], ephemeral: true })
    }
}
