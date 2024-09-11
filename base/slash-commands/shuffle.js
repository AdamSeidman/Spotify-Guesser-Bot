/**
 * Shuffle the starting song.
 * 
 * Author: Adam Seidman
 */

const games = require('../game')
const Discord = require('discord.js')

module.exports = {
    phrase: 'shuffle',
    data: new Discord.SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle first word of the game.'),
    execute: interaction => games.shuffle(interaction)
}
