/**
 * Show history of a game.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const games = require('../game')
const Discord = require('discord.js')
const { historyEmbed } = require('../embedBuilder')
const { hideOption, getHideResult, escapeDiscordString } = require('../helpers')

var showHistory = function(interaction, title, game, isCurrent) {
    if (interaction === undefined) return
    if (title === undefined || game === undefined || game.hist === undefined) {
        interaction.reply({content: 'Internal Error!', ephemeral: true})
    }
    else {
        let embed = historyEmbed(game.hist, title, interaction.guild, isCurrent? undefined : 
            `${game.hist.list.length > 1? '\n' : ''}Chain broken by <@${game.ruinedMemberId}> (${game.ruinedText})`, isCurrent)
        interaction.reply({embeds: [embed], ephemeral: getHideResult(interaction)})
    }
}

const subCommands = {
    best: async interaction => {
        let max = 0
        let idx = -1
        let histories = await db.getAllGuildHistories(interaction.guild.id)
        histories.forEach((x, i) => {
            if (x.hist.list.length > max) {
                max = x.hist.list.length
                idx = i
            }
        })
        if (idx < 0) {
            interaction.reply({content: 'Could not find a game!', ephemeral: true})
        }
        else {
            showHistory(interaction, `Best round for __${
                escapeDiscordString(interaction.guild.name)
            }__ (Round #${idx + 1})`, histories[idx])
        }
    },
    last: async interaction => {
        let histories = await db.getAllGuildHistories(interaction.guild.id)
        if (histories.length === 0) {
            interaction.reply({content: 'Could not find a game!', ephemeral: true})
        }
        else {
            showHistory(interaction, `Last round for __${
                escapeDiscordString(interaction.guild.name)
            }__ (Round #${histories.length})`, histories[histories.length - 1])
        }
    },
    current: async interaction => {
        let game = games.getHistory(interaction.guild.id)
        if (game === undefined) {
            interaction.reply({content: 'Could not find a game!', ephemeral: true})
        }
        else {
            let histories = await db.getAllGuildHistories(interaction.guild.id)
            showHistory(interaction, `Current round for __${
                escapeDiscordString(interaction.guild.name)
            }__ (Round #${histories.length + 1})`, {hist: game}, true)
        }
    },
    round: async interaction => {
        let num = interaction.options.getInteger('number')
        if (num === null) {
            interaction.reply({content: 'Could not get round!', ephemeral: true})
        }
        else {
            let histories = await db.getAllGuildHistories(interaction.guild.id)
            if (histories.length === 0) {
                interaction.reply({content: 'There are no games to choose from!', ephemeral: true})
            }
            else if (num > histories.length) {
                interaction.reply({content: `There are only ${histories.length} rounds!`, ephemeral: true})
            }
            else {
                showHistory(interaction, `Round ${num} for __${
                    escapeDiscordString(interaction.guild.name)
                }__`, histories[num - 1])
            }
        }
    }
}

module.exports = {
    phrase: 'history',
    data: new Discord.SlashCommandBuilder()
        .setName('history')
        .setDescription('See history of a song chain.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('best')
                .addStringOption(hideOption)
                .setDescription('Show history of best round.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('last')
                .addStringOption(hideOption)
                .setDescription('Show history of last round.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('current')
                .addStringOption(hideOption)
                .setDescription('Show history of current round.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('round')
                .addIntegerOption(opt =>
                    opt
                        .setName('number')
                        .setDescription('Round number to get history of.')
                        .setMinValue(1)
                        .setRequired(true)
                )
                .addStringOption(hideOption)
                .setDescription('Show history of specified round.')
        ),
    execute: async interaction => {
        let sub = interaction.options.getSubcommand()
        if ( typeof sub !== 'string' || subCommands[sub] === undefined ) {
            interaction.reply({ content: 'Could not find history sub-command!', ephemeral: true })
        }
        subCommands[sub](interaction)
    }
}
