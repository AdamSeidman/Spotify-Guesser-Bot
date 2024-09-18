/**
 * Leaderboard handling and sub-commands.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const Discord = require('discord.js')
const embedBuilder = require('../embedBuilder')

const userLeaderboard = async (interaction, guildId, title) => {
    let scores = await db.getAllScores(guildId)
    let valueArray = []
    Object.keys(scores).forEach(key => {
        let map = {}
        map[key] = scores[key]
        valueArray.push(map)
    })
    valueArray.sort((a, b) => {
        let scoreA = a[Object.keys(a)[0]]
        let scoreB = b[Object.keys(b)[0]]
        return scoreB - scoreA
    })
    let leaderboard = embedBuilder.newLeaderboardEmbed(title, valueArray)
    console.log(leaderboard.idx)
    interaction.editReply({embeds: [leaderboard.embed]})
}

const serverLeaderboard = interaction => {
    userLeaderboard( interaction, interaction.guild.id, `User Leaderboard for \`${interaction.guild.name}\`` )
}

const globalUserLeaderboard = interaction => {
    userLeaderboard( interaction, undefined, 'Global User Leaderboard' )
}

const globalServerLeaderboard = async interaction => {
    let maxScores = await db.getGuildMaxScores()
    let valueArray = []
    Object.keys(maxScores).forEach(x => {
        let map = {}
        map[maxScores[x].name] = maxScores[x].score
        valueArray.push(map)
    })
    valueArray.sort((a, b) => {
        let scoreA = a[Object.keys(a)[0]]
        let scoreB = b[Object.keys(b)[0]]
        return scoreB - scoreA
    })
    let leaderboard = embedBuilder.newLeaderboardEmbed('Global Server Leaderboard', valueArray)
    console.log(leaderboard.idx)
    interaction.editReply({embeds: [leaderboard.embed]})
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
