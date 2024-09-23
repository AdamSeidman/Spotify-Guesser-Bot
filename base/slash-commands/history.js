/**
 * Show history of a game.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const games = require('../game')
const Discord = require('discord.js')
const config = require('../../client/config')
const log = require('better-node-file-logger')
const { hideOption, getHideResult, escapeDiscordString, getActionRow, copyObject } = require('../helpers')

const historyCache = []

var magicNumber = `X${(Math.round(new Date().getTime() / 1000) + 100)}`

const disabledButtons = [
    {
        btn: new Discord.ButtonBuilder()
            .setLabel('⏮️')
            .setStyle(Discord.ButtonStyle.Primary)
            .setCustomId('history_X1_0')
    }, {
        btn: new Discord.ButtonBuilder()
            .setLabel('◀️')
            .setStyle(Discord.ButtonStyle.Primary)
            .setCustomId('history_X1_1')
    }, {
        btn: new Discord.ButtonBuilder()
            .setLabel('▶️')
            .setStyle(Discord.ButtonStyle.Primary)
            .setCustomId('history_X1_2')
    }, {
        btn: new Discord.ButtonBuilder()
            .setLabel('⏭️')
            .setStyle(Discord.ButtonStyle.Primary)
            .setCustomId('history_X1_3')
    }
]

disabledButtons.forEach(x => {
    x.btn.data.disabled = true
})

const getHistoryButtons = (idx, startVal) => {
    if (idx >= historyCache.length || historyCache[idx].list.length < config.options.maxHistorySlots) {
        return []
    }
    let buttons = [
        new Discord.ButtonBuilder()
            .setCustomId(`history_${magicNumber}_first_${idx}`)
            .setLabel('⏮️')
            .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
            .setCustomId(`history_${magicNumber}_back_${idx}_${startVal}`)
            .setLabel('◀️')
            .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
            .setCustomId(`history_${magicNumber}_forward_${idx}_${startVal}`)
            .setLabel('▶️')
            .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
            .setCustomId(`history_${magicNumber}_last_${idx}`)
            .setLabel('⏭️')
            .setStyle(Discord.ButtonStyle.Primary)
    ].map(x => {
        return { btn: x }
    })
    if ( startVal == 0 ) {
        buttons[0].btn.data.disabled = true
        buttons[1].btn.data.disabled = true
    }
    else if (startVal + config.options.maxHistorySlots >= historyCache[idx].list.length) {
        buttons[2].btn.data.disabled = true
        buttons[3].btn.data.disabled = true
    }
    if (buttons.length > 0) {
        return getActionRow(buttons)
    }
    return buttons
}

const newHistoryEmbed = (title, history, userId, thumbnail, isCurrent) => {
    let firstLine = `Started with: ${escapeDiscordString(history.hist.list.shift().full)}\n`
    let values = []
    history.hist.list.forEach((track, idx) => {
        values.push(`**${idx + 1}**)  ` + escapeDiscordString(`${track.full} (<@${track.memberId}>)`))
    })
    if (values.length > 0) {
        values[0] = `${firstLine}\n${values[0]}`
    } else {
        values = [firstLine]
    }
    if (!isCurrent) {
        let lastLine = `${history.hist.list.length > 0? '\n' : ''}Chain broken by <@${history.ruinedMemberId}> (${history.ruinedText})`
        values[values.length - 1] = `${values[values.length - 1]}\n${lastLine}`
    }
    historyCache.push({title, list: copyObject(values), userId, thumbnail})
    let desc = []
    while (values.length > 0 && desc.length < config.options.maxHistorySlots) {
        desc.push(values.shift())
    }
    let idx = historyCache.length - 1
    let buttons = getHistoryButtons(idx, 0)
    return { embed: new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(title)
        .setDescription(desc.join('\n'))
        .setThumbnail(thumbnail),
    buttons, idx }
}

const cachedHistoryEmbed = (cachedVal, startVal) => {
    if (cachedVal === undefined || cachedVal < 0 || cachedVal >= historyCache.length) return
    let desc = []
    let values = copyObject(historyCache[cachedVal].list).slice(startVal)
    while (values.length > 0 && desc.length < config.options.maxHistorySlots) {
        desc.push(values.shift())
    }
    desc = desc.join('\n')
    return new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(historyCache[cachedVal].title)
        .setDescription(desc.length > 0? desc : ' ')
        .setThumbnail(historyCache[cachedVal].thumbnail)
}

const showHistory = (interaction, title, game, isCurrent) => {
    if (interaction === undefined) return
    if (title === undefined || game === undefined || game.hist === undefined) {
        interaction.reply({content: 'Internal Error!', ephemeral: true})
    }
    else {
        let history = newHistoryEmbed(title, game, interaction.user.id, interaction.guild.iconURL(), isCurrent)
        interaction.editReply({embeds: [history.embed], components: history.buttons})
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
            interaction.editReply({content: 'Could not find a game!', ephemeral: true})
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
            interaction.editReply({content: 'Could not find a game!', ephemeral: true})
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
            interaction.editReply({content: 'Could not find a game!', ephemeral: true})
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
            interaction.editReply({content: 'Could not get round!', ephemeral: true})
        }
        else {
            let histories = await db.getAllGuildHistories(interaction.guild.id)
            if (histories.length === 0) {
                interaction.editReply({content: 'There are no games to choose from!', ephemeral: true})
            }
            else if (num > histories.length) {
                interaction.editReply({content: `There are only ${histories.length} rounds in this server!`, ephemeral: true})
            }
            else {
                showHistory(interaction, `Round ${num} for __${
                    escapeDiscordString(interaction.guild.name)
                }__`, histories[num - 1])
            }
        }
    }
}

const updateBoard = (interaction, boardId, idx) => {
    let embed = cachedHistoryEmbed(boardId, idx)
    if (embed) {
        let components = getHistoryButtons(boardId, idx)
        interaction.update({embeds: [embed], components})
    } else {
        interaction.reply({ content: 'Error updating the round history.', ephemeral: true })
    }
}

const buttonActionFirst = (interaction, boardId) => {
    updateBoard(interaction, boardId, 0)
}

const buttonActionBack = (interaction, boardId, startIdx) => {
    if ( isNaN(startIdx) ) {
        interaction.reply({ content: 'Could not find button interaction start index!', ephemeral: true })
        return
    }
    let idx = startIdx - config.options.maxHistorySlots
    updateBoard(interaction, boardId, idx < 0? 0 : idx)
}


const buttonActionForward = (interaction, boardId, startIdx) => {
    if ( isNaN(startIdx) ) {
        interaction.reply({ content: 'Could not find button interaction start index!', ephemeral: true })
        return
    }
    let idx = startIdx + config.options.maxHistorySlots
    if (idx >= historyCache[boardId].list.length) {
        idx = historyCache[boardId].list.length - 1
    }
    updateBoard(interaction, boardId, idx)
}

const buttonActionLast = (interaction, boardId) => {
    let size = historyCache[boardId].list.length
    let count = 0
    while (size > config.options.maxHistorySlots) {
        size -= config.options.maxHistorySlots
        count++
    }
    updateBoard(interaction, boardId, count * config.options.maxHistorySlots)
}

const buttonActions = {
    first: buttonActionFirst,
    back: buttonActionBack,
    forward: buttonActionForward,
    last: buttonActionLast
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
        await interaction.deferReply({ephemeral: getHideResult(interaction)})
        subCommands[sub](interaction)
    },
    btnActionHandler: async interaction => {
        if ( typeof interaction.customId !== 'string' ) {
            log.error('No string args in history handler!')
            interaction.reply({ content: 'Internal Error!', ephemeral: true })
            return
        }
        let actionParts = interaction.customId.split('_')
        if ( actionParts[1] === undefined || actionParts[1] != magicNumber ) {
            await interaction.update({components: getActionRow(disabledButtons)})
            interaction.followUp({ content: 'This history command has expired.\nPlease re-run the desired command.', ephemeral: true })
            return
        }
        if ( actionParts[2] === undefined || buttonActions[actionParts[2]] === undefined || actionParts[3] === undefined ) {
            interaction.reply({ content: 'Could not find history or was invalid!', ephemeral: true })
            return
        }
        let idx = parseInt(actionParts[3])
        if ( isNaN(idx) || idx < 0 || idx >= historyCache.length ) {
            interaction.reply({ content: 'Button interaction parameters were invalid.', ephemeral: true })
            return
        }
        buttonActions[actionParts[2]](interaction, idx, parseInt(actionParts[4]))
    },
    immediate: true
}
