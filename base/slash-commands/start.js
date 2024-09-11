/**
 * Start a new game.
 * 
 * Author: Adam Seidman
 */

const games = require('../game')
const Discord = require('discord.js')

var startGame = async function(msg) {
    let game = games.getGame(msg.guild.id)
    if (game !== undefined) {
        msg.reply('This server already has an active game!')
        return
    }
    let track = await games.createGame(msg)
    msg.reply(`Start the game with \`${track.full}\` (next word \`${track.name.toLowerCase().split(' ').slice(-1)[0]}\`).`)
}

module.exports = {
    phrase: 'start',
    data: new Discord.SlashCommandBuilder().setName('start').setDescription('Start new chain!'),
    execute: startGame
}
