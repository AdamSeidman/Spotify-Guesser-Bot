/**
 * Display information about this bot.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const Discord = require('discord.js')
const spotify = require('../spotify')
const config = require('../../client/config')

const makePlaylist = async interaction => {
    let num = interaction.options.getInteger('number')
    if (num === null || num < 1) {
        interaction.reply({content: 'Could not get round!', ephemeral: true})
    }
    let histories = await db.getAllGuildHistories(interaction.guild.id)
    if (num === histories.length + 1) {
        interaction.reply({content: 'Cannot make a playlist for in-progress round!', ephemeral: true})
    }
    else if (num > histories.length || histories[num - 1] === undefined) {
        interaction.reply({content: `Only ${histories.length} rounds have been played!`, ephemeral: true})
    }
    else if (histories[num - 1].hist.list.length <= config.options.minPlaylistTracks) {
        interaction.reply({content: `At least ${config.options.minPlaylistTracks} contributions are required to make a playlist.`, ephemeral: true})
    }
    else {
        await interaction.deferReply()
        try {
            let title = `${interaction.guild.name} Chain-Round ${num}`
            let url = await spotify.createPlaylist(title, histories[num - 1].hist.list, interaction.guild.iconURL())
            interaction.editReply(`Playlist created for round ${num}!\n${url}`)
        } catch (err) {
            interaction.editReply('Playlist could not be created!')
            console.error('Could not create playlist!', err)
        }
    }
}

module.exports = {
    phrase: 'playlist',
    data: new Discord.SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Make a playlist from a completed chain.')
        .addIntegerOption(opt =>
            opt
                .setName('number')
                .setDescription('Round number to make playlist of.')
                .setMinValue(1)
                .setRequired(true)
        ),
    execute: makePlaylist,
    immediate: true
}
