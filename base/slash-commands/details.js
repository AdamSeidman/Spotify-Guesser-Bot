/**
 * Get details of a guessed song.
 * 
 * Author: Adam Seidman
 */

const games = require('../game')
const Discord = require('discord.js')
const { trackDetailsEmbed } = require('../embedBuilder')
const { hideOption, getHideResult } = require('../helpers')

const getDetails = interaction => {
    let game = games.getGame(interaction.guild.id)
    if (game === undefined) {
        interaction.reply({content: 'There is no game in progress!', ephemeral: true})
    }

    let track = game.currentTrack
    let trackNum = interaction.options.getInteger('track', false)
    if (trackNum) {
        let ret = games.getTrack(game.key, trackNum)
        if (ret) track = ret
    }
    if (track) {
        interaction.reply({embeds: [trackDetailsEmbed(track)], ephemeral: getHideResult(interaction)})
    }
    else {
        interaction.reply({content: 'Error! Could not find details.', ephemeral: true})
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
        )
        .addStringOption(hideOption),
    execute: getDetails,
    immediate: true
}
