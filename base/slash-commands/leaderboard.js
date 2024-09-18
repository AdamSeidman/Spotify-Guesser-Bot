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

const getLeaderboardButtons = (idx, startVal, maxVal) => {
    // if (maxVal < config.options.maxLeaderboardSlots) { // TODO put back
    //     return []
    // }
    let buttons = [
        new Discord.ButtonBuilder()
            .setCustomId(`leaderboard_first_${magicNumber}_${idx}`)
            .setLabel('⏮️')
            .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
            .setCustomId(`leaderboard_back_${magicNumber}_${idx}_${startVal}`)
            .setLabel('◀️')
            .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
            .setCustomId(`leaderboard_forward_${magicNumber}_${idx}_${startVal}`)
            .setLabel('▶️')
            .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
            .setCustomId(`leaderboard_last_${magicNumber}_${idx}`)
            .setLabel('⏭️')
            .setStyle(Discord.ButtonStyle.Primary) // TODO remove buttons if list isn't long enough
    ].map(x => {
        return { btn: x }
    })
    if ( startVal == 0 ) {
        buttons[0].btn.data.disabled = true
        buttons[1].btn.data.disabled = true
    }
    else if (startVal + config.options.maxLeaderboardSlots < maxVal) {
        buttons[2].btn.data.disabled = true
        buttons[3].btn.data.disabled = true
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
    buttons[0].btn.data.disabled = true
    buttons[1].btn.data.disabled = true
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
    return new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(leaderboardCache[cachedVal].title)
        .setDescription(desc.join('\n'))
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
    console.log(leaderboard.idx) // TODO
    interaction.editReply({embeds: [leaderboard.embed], components: getActionRow(leaderboard.buttons)})
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
    console.log(leaderboard.idx)
    interaction.editReply({embeds: [leaderboard.embed]})
}

const subCommands = {
    server: serverLeaderboard,
    'global-users': globalUserLeaderboard,
    'global-servers': globalServerLeaderboard
}

const buttonActionFirst = (interaction, boardId) => {
    console.log(1)
}

const buttonActionBack = (interaction, boardId, startIdx) => {
    if ( isNaN(startIdx) ) {
        interaction.reply({ content: 'Could not find button interaction start index!', ephemeral: true })
        return
    }
}

const buttonActionForward = (interaction, boardId, startIdx) => {
    if ( isNaN(startIdx) ) {
        interaction.reply({ content: 'Could not find button interaction start index!', ephemeral: true })
        return
    }
    console.log(3)
}

const buttonActionLast = (interaction, boardId) => {
    console.log(4)
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
        if ( actionParts[1] === undefined || actionParts[1] !== magicNumber ) {
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
        buttonActions[actionParts[2]](interaction, idx, parseInt(actionParts[3]))
    }
}
