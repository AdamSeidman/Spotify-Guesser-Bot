/**
 * See if any song exists.
 * 
 * Author: Adam Seidman
 */

const Discord = require('discord.js')
const spotify = require('../spotify')
const { trackDetailsEmbed } = require('../embedBuilder')
const { hideOption, getHideResult } = require('../helpers')

module.exports = {
    phrase: 'song-info',
    data: new Discord.SlashCommandBuilder()
        .setName('song-info')
        .setDescription('Get information on any song.')
        .addStringOption(option =>
            option
                .setName('track')
                .setDescription('Song to find.')
                .setRequired(true)
        )
        .addStringOption(hideOption),
    execute: async interaction => {
        await interaction.deferReply({ ephemeral: getHideResult(interaction) })
        let title = interaction.options.getString('track')
        let track = await spotify.getTrackByArtist( title )
        if ( track === undefined ) {
            track = await spotify.getTrack( title )
        }
        if ( track ) {
            interaction.editReply({embeds: [trackDetailsEmbed(track)]})
        }
        else {
            interaction.editReply(`Could not find \`${title}\``)
        }
    },
    immediate: true
}
