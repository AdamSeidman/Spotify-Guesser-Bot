/**
 * Shuffle the starting song.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const log = require('../log')
const games = require('../game')
const Discord = require('discord.js')

module.exports = {
    phrase: 'shuffle',
    data: new Discord.SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle first word of the game.'),
    execute: async interaction => {
        let rules = await db.getServerRules(interaction.guild.id)
        try {
            if (rules['shuffle-allowed']) {
                games.shuffle(interaction)
            }
            else {
                interaction.reply({ content: 'Shuffling is not allowed on this server.', ephemeral: true })
            }
        }
        catch (err) {
            log.error('Error shuffling.', err)
        }
    }
}
