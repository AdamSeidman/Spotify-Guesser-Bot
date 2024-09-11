/**
 * Statistics sub-commands.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const Discord = require('discord.js')
const config = require('../../client/config')
const { getPercentage } = require('../helpers')

var showUserStats = async function(interaction) {
    let userId = interaction.member.id // TODO make args possible
    let globalCorrect = 0, guildCorrect = 0
    let globalIncorrect = 0, guildIncorrect = 0
    let guessBuf = []
    let guesses = await db.getAllGuesses(userId)
    guesses.forEach(guess => {
        if (guess.pass) {
            globalCorrect++
            if (guess.guildId == interaction.guild.id) guildCorrect++

            let idx = guessBuf.findIndex(x => {
                return x.full === guess.track.full
            })
            if (idx < 0) {
                guessBuf.push({
                    full: guess.track.full,
                    count: 1
                })
            }
            else {
                guessBuf[idx].count++
            }
        }
        else {
            globalIncorrect++
            if (guess.guildId == interaction.guild.id) guildIncorrect++
        }
    })
    let favoriteSong = '(N/a)'
    let max = 0
    guessBuf.forEach(song => {
        if (song.count > max) {
            favoriteSong = song.full
            max = song.count
        }
    })
    let globalStats = `Correct: **${globalCorrect}**
        Incorrect: **${globalIncorrect}**
        Correct Rate: **${getPercentage(globalCorrect, guesses.length)}**
        Score: **${globalCorrect - globalIncorrect}**`
    let guildStats = `Correct: **${guildCorrect}**
        Incorrect: **${guildIncorrect}**
        Correct Rate: **${getPercentage(guildCorrect, (guildCorrect + guildIncorrect))}**
        Score: **${guildCorrect - guildIncorrect}**`
    let fields = [
        {name: 'Global Stats', value: globalStats, inline: true},
        {name: `Stats for \`${interaction.guild.name}\``, value: guildStats, inline: true},
        {name: 'Favorite Song', value: `_${favoriteSong}_`}
    ]
    let userStatEmbed = new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle('User Stats')
        .setAuthor({ name: interaction.member.user.username, iconURL: interaction.member.displayAvatarURL() })
        .addFields(...fields)
    interaction.editReply({embeds: [userStatEmbed]})
}

const subCommands = {
    user: showUserStats
}

module.exports = {
    phrase: 'stats',
    data: new Discord.SlashCommandBuilder().setName('stats').setDescription('Show statistics for song chains.')
        .addSubcommand(subcommand => 
            subcommand
                .setName('user')
                .setDescription('Show user statistics')/*
                .addUserOption(option => {
                    option
                        .setName('member')
                        .setDescription('User to get stats of.')
                        .setRequired(false)
                })*/
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
