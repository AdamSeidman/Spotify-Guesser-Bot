/**
 * Info for current round.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const games = require('../game')
const Discord = require('discord.js')
const log = require('better-node-file-logger')
const { hideOption, getHideResult, strip } = require('../helpers')

const getNextWord = (interaction, hide) => {
    let game = games.getGame(interaction.guild.id)
    if (game) {
        let words = game.currentTrack.name.trim().split(' ')
        interaction.reply({content: `The next word is \`${
            strip(words.slice(-1)[0].toLowerCase())
        }\`.`, ephemeral: hide})
    }
    else {
        interaction.reply({content: 'There is no game running!', ephemeral: true})
    }
}

const getCurrentRound = async (interaction, hide) => {
    if (games.getGame(interaction.guild.id)) {
        let guesses = await db.getGuildPreviousGames(interaction.guild.id)
        interaction.reply({content: `This is round #${
            Discord.underline(Discord.bold(guesses.length + 1))
        }.`, ephemeral: hide})
    }
    else {
        interaction.reply({content: 'No game has been started!', ephemeral: true})
    }
}

const showRules = async (interaction, hide) => {
    let rules = await db.getServerRules(interaction.guild.id)
    if (rules) {
        interaction.reply({content: `${Discord.bold('Server Rules')}:\n  Prefix: \`${
            rules.prefix
        }\`\n  Single Words Allowed:  \`${
            rules['single-words-allowed']
        }\`\n  Challenges Allowed:  \`${
            rules['challenges-allowed']
        }\`\n  Shuffle Allowed:  \`${
            rules['shuffle-allowed']
        }\`\n  Challenge First Song Allowed:  \`${
            rules['challenge-first']
        }\`\n  Artist Required in Guess:  \`${
            rules['artist-required']
        }\``, ephemeral: hide})
    }
    else {
        log.warn('Could not get server rules!', interaction.guild.id)
        interaction.reply({content: 'Error. Could not find server rules!', ephemeral: true})
    }
}

const subCommands = {
    'next-word': getNextWord,
    'round-number': getCurrentRound,
    rules: showRules
}

module.exports = {
    phrase: 'info',
    data: new Discord.SlashCommandBuilder()
        .setName('info')
        .setDescription('See server and game information.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('next-word')
                .setDescription('Get the next word in the current chain.')
                .addStringOption(hideOption)
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('round-number')
                .setDescription('Get the round number of the current chain.')
                .addStringOption(hideOption)
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('rules')
                .setDescription('See server rules.')
                .addStringOption(hideOption)
        ),
    execute: async interaction => {
        let sub = interaction.options.getSubcommand()
        if ( typeof sub !== 'string' || subCommands[sub] === undefined ) {
            log.warn('Got unknown sub-command!')
            interaction.reply({ content: 'Could not find info sub-command!', ephemeral: true })
        }
        subCommands[sub](interaction, getHideResult(interaction))
    },
    immediate: true
}
