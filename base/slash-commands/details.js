/**
 * Get details of a guessed song.
 * 
 * Author: Adam Seidman
 */

const games = require('../game')
const Discord = require('discord.js')
const { trackDetailsEmbed } = require('../embedBuilder')

var getDetails = function(msg) {
    let game = games.getGame(msg.guild.id)
    if (game === undefined) {
        msg.reply('There is no game in progress!')
    }

    let track = game.currentTrack
    let trackNum = msg.options.getInteger('track', false)
    if (trackNum) {
        let ret = games.getTrack(game.key, trackNum)
        if (ret) track = ret
    }
    if (track) {
        msg.reply({embeds: [trackDetailsEmbed(track)]})
    }
    else {
        msg.reply('Error! Could not find details.')
    }
}

module.exports = {
    phrase: 'details',
    data: new Discord.SlashCommandBuilder()
        .setName('details')
        .setDescription('Get most recent song description.')
        .addIntegerOption(opt => 
            opt
                .setName('track')
                .setDescription('Track number to get details of.')
                .setMinValue(0)
                .setRequired(false)
        ),
    execute: getDetails
}
