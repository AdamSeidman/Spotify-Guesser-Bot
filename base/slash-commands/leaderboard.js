/**
 * Leaderboard handling and sub-commands.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const Discord = require('discord.js')
const config = require('../../client/config')
const { getActionRow, copyObject } = require('../helpers')

const leaderboardCache = []

var magicNumber = `X${Math.round(new Date().getTime() / 1000)}`

const disabledButtons = [
    {
        btn: new Discord.ButtonBuilder()
            .setLabel('⏮️')
            .setStyle(Discord.ButtonStyle.Primary)
            .setCustomId('leaderboard_X1_0')
    }, {
        btn: new Discord.ButtonBuilder()
            .setLabel('◀️')
            .setStyle(Discord.ButtonStyle.Primary)
            .setCustomId('leaderboard_X1_1')
    }, {
        btn: new Discord.ButtonBuilder()
            .setLabel('▶️')
            .setStyle(Discord.ButtonStyle.Primary)
            .setCustomId('leaderboard_X1_2')
    }, {
        btn: new Discord.ButtonBuilder()
            .setLabel('⏭️')
            .setStyle(Discord.ButtonStyle.Primary)
            .setCustomId('leaderboard_X1_3')
    }
]

disabledButtons.forEach(x => {
    x.btn.data.disabled = true
})

const getLeaderboardButtons = (idx, startVal) => {
    if (idx >= leaderboardCache.length || leaderboardCache[idx].list.length < config.options.maxLeaderboardSlots) {
        return []
    }
    let buttons = [
        new Discord.ButtonBuilder()
            .setCustomId(`leaderboard_${magicNumber}_first_${idx}`)
            .setLabel('⏮️')
            .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
            .setCustomId(`leaderboard_${magicNumber}_back_${idx}_${startVal}`)
            .setLabel('◀️')
            .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
            .setCustomId(`leaderboard_${magicNumber}_forward_${idx}_${startVal}`)
            .setLabel('▶️')
            .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
            .setCustomId(`leaderboard_${magicNumber}_last_${idx}`)
            .setLabel('⏭️')
            .setStyle(Discord.ButtonStyle.Primary)
    ].map(x => {
        return { btn: x }
    })
    if ( startVal == 0 ) {
        buttons[0].btn.data.disabled = true
        buttons[1].btn.data.disabled = true
    }
    else if (startVal + config.options.maxLeaderboardSlots >= leaderboardCache[idx].list.length) {
        buttons[2].btn.data.disabled = true
        buttons[3].btn.data.disabled = true
    }
    if (buttons.length > 0) {
        return getActionRow(buttons)
    }
    return buttons
}

const newLeaderboardEmbed = (title, valueArray, userId) => {
    let desc = []
    let values = copyObject(valueArray)
    leaderboardCache.push({title, list: valueArray, userId})
    while (values.length > 0 && desc.length < config.options.maxLeaderboardSlots) {
        let item = values.shift()
        let key = Object.keys(item)[0]
        desc.push(`${desc.length + 1}. ${key} - **${item[key]}**`)
    }
    let idx = leaderboardCache.length - 1
    let buttons = getLeaderboardButtons(idx, 0)
    return { embed: new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(title)
        .setDescription(desc.join('\n')),
    buttons, idx }
}

const cachedLeaderboardEmbed = (cachedVal, startVal) => {
    if (cachedVal === undefined || cachedVal < 0 || cachedVal >= leaderboardCache.length) return
    let desc = []
    let values = copyObject(leaderboardCache[cachedVal].list).slice(startVal)
    while (values.length > 0 && desc.length < config.options.maxLeaderboardSlots) {
        let item = values.shift()
        let key = Object.keys(item)[0]
        desc.push(`${desc.length + 1 + startVal}. ${key} - **${item[key]}**`)
    }
    desc = desc.join('\n')
    return new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(leaderboardCache[cachedVal].title)
        .setDescription(desc.length > 0? desc : ' ')
}

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
    let leaderboard = newLeaderboardEmbed(title, valueArray, interaction.member.id)
    interaction.editReply({embeds: [leaderboard.embed], components: leaderboard.buttons})
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
    let leaderboard = newLeaderboardEmbed('Global Server Leaderboard', valueArray, interaction.member.id)
    interaction.editReply({embeds: [leaderboard.embed]})
}

const subCommands = {
    server: serverLeaderboard,
    'global-users': globalUserLeaderboard,
    'global-servers': globalServerLeaderboard
}

const updateBoard = (interaction, boardId, idx) => {
    let embed = cachedLeaderboardEmbed(boardId, idx)
    if (embed) {
        let components = getLeaderboardButtons(boardId, idx)
        interaction.update({embeds: [embed], components})
    } else {
        interaction.reply({ content: 'Error updating the leaderboard.', ephemeral: true })
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
    let idx = startIdx - config.options.maxLeaderboardSlots
    updateBoard(interaction, boardId, idx < 0? 0 : idx)
}


const buttonActionForward = (interaction, boardId, startIdx) => {
    if ( isNaN(startIdx) ) {
        interaction.reply({ content: 'Could not find button interaction start index!', ephemeral: true })
        return
    }
    let idx = startIdx + config.options.maxLeaderboardSlots
    if (idx >= leaderboardCache[boardId].list.length) {
        idx = leaderboardCache[boardId].list.length - 1
    }
    updateBoard(interaction, boardId, idx)
}

const buttonActionLast = (interaction, boardId) => {
    let size = leaderboardCache[boardId].list.length
    let count = 0
    while (size > config.options.maxLeaderboardSlots) {
        size -= config.options.maxLeaderboardSlots
        count++
    }
    updateBoard(interaction, boardId, count * config.options.maxLeaderboardSlots)
}

const buttonActions = {
    first: buttonActionFirst,
    back: buttonActionBack,
    forward: buttonActionForward,
    last: buttonActionLast
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
    },
    btnActionHandler: async interaction => {
        if ( typeof interaction.customId !== 'string' ) {
            interaction.reply({ content: 'Internal Error!', ephemeral: true })
            return
        }
        let actionParts = interaction.customId.split('_')
        if ( actionParts[1] === undefined || actionParts[1] != magicNumber ) {
            await interaction.update({components: getActionRow(disabledButtons)})
            interaction.followUp({ content: 'This leaderboard has expired.\nPlease re-run the desired command.', ephemeral: true })
            return
        }
        if ( actionParts[2] === undefined || buttonActions[actionParts[2]] === undefined || actionParts[3] === undefined ) {
            interaction.reply({ content: 'Could not find leaderboard or was invalid!', ephemeral: true })
            return
        }
        let idx = parseInt(actionParts[3])
        if ( isNaN(idx) || idx < 0 || idx >= leaderboardCache.length ) {
            interaction.reply({ content: 'Button interaction parameters were invalid.', ephemeral: true })
            return
        }
        buttonActions[actionParts[2]](interaction, idx, parseInt(actionParts[4]))
    },
    immediate: true
}
