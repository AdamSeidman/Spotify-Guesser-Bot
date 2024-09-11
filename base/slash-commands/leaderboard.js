/**
 * Leaderboard handling and sub-commands.
 * 
 * Author: Adam Seidman
 */

const Discord = require('discord.js')

var serverLeaderboard = function(interaction) {
    interaction.editReply('Not implemented :(')
}

var globalUserLeaderboard = function(interaction) {
    interaction.editReply('Not implemented :(')
}

var globalServerLeaderboard = function(interaction) {
    interaction.editReply('Not implemented :(')
}

const subCommands = {
    server: serverLeaderboard,
    'global-users': globalUserLeaderboard,
    'global-servers': globalServerLeaderboard
}

module.exports = {
    phrase: 'leaderboard',
    data: new Discord.SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show local and global leaderboards for the game.')
        .addSubcommand(subcommand => 
            subcommand
                .setName('server')
                .setDescription('Show server leaderboard.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('global-users')
                .setDescription('Show global statistics by user.')
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('global-servers')
                .setDescription('Show global statistics by server.')
        ),
    execute: async interaction => {
        let sub = interaction.options.getSubcommand()
        if ( typeof sub !== 'string' || subCommands[sub] === undefined ) {
            interaction.reply({ content: 'Could not find stats sub-command!', ephemeral: true })
        }
        await interaction.deferReply()
        subCommands[sub](interaction)
    }
}
