/**
 * Challenge impossible songs in chain.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const games = require('../game')
const spotify = require('../spotify')
const Discord = require('discord.js')
const { getActionRow, strip } = require('../helpers')
const { trackDetailsEmbed } = require('../embedBuilder')

var pendingChallenges = {}

const getCurrentContext = interaction => {
    let game = games.getGame(interaction.guild.id)
    if (game === undefined || game.count < 1) return {game}
    return {game, word: strip(game.currentTrack.name.trim().toLowerCase().split(' ').slice(-1)[0])}

}

const confirmAction = interaction => {
    let key = `${interaction.guild.id}|${interaction.member.id}`
    let context = getCurrentContext(interaction)
    if (context.game.count < 1 || pendingChallenges[key] === undefined || pendingChallenges[key] !== context.word) {
        if (pendingChallenges[key]) {
            delete pendingChallenges[key]
        }
        interaction.update({content: 'This challenge is no longer valid.', components: []})
    }
    else {
        interaction.update({content: 'Challenge Submitted!', components: []})
        interaction.channel.send(`<@${interaction.member.id}> issued a challenge against \`${context.game.currentTrack.name}\`!`)
        spotify.getFirstTrack(context.word, context.game.usedTracks).then(async track => {
            db.makeChallengeResult(interaction.guild.id, interaction.member.id, track === undefined)
            if (track) {
                await games.failure(interaction, 'Challenge failed.')
                interaction.channel.send({content: 'Challenge failed!', embeds: [trackDetailsEmbed(track)]})
                track = await games.createGame(interaction)
                interaction.channel.send(`Start again from \`${track.full}\` (next word \`${track.name.toLowerCase().split(' ').slice(-1)[0]}\`)`)
            }
            else {
                let track = await games.addBotTrack(interaction)
                interaction.channel.send(`Challenge successful! Continue with \`${track.full}\` (next word \`${
                    track.name.toLowerCase().split(' ').slice(-1)[0]
                }\`)`)
            }
        })
    }
}

const cancelAction = interaction => {
    interaction.update({content: 'Challenge Cancelled.', components: []})
}

const buttons = [
    {
        btn: new Discord.ButtonBuilder()
            .setCustomId('challenge_confirm')
            .setLabel('Yes')
            .setStyle(Discord.ButtonStyle.Primary),
        execute: confirmAction
    }, {
        btn: new Discord.ButtonBuilder()
            .setCustomId('challenge_cancel')
            .setLabel('Cancel')
            .setStyle(Discord.ButtonStyle.Secondary),
        execute: cancelAction
    }
]

module.exports = {
    phrase: 'challenge',
    data: new Discord.SlashCommandBuilder()
        .setName('challenge')
        .setDescription('Challenge the last word in the chain!'),
    execute: async interaction => {
        let rules = await db.getServerRules(interaction.guild.id)
        if (rules === undefined) {
            console.error('Unknown error?')
            return
        }
        else if (!rules['challenges-allowed']) {
            interaction.reply({content: 'Challenges are not enabled on this server.', ephemeral: true})
            return
        }
        let game = games.getGame(interaction.guild.id)
        if (game === undefined) {
            interaction.reply({content: 'No game to challenge!', ephemeral: true})
        }
        else if (game.count < 1) {
            interaction.reply({content: 'No guesses have been made on this chain!', ephemeral: true})
        }
        else if (game.lastMemberId == interaction.member.id) {
            interaction.reply({content: 'You cannot challenge your own guess!', ephemeral: true})
        }
        else {
            pendingChallenges[`${interaction.guild.id}|${interaction.member.id}`] = getCurrentContext(interaction).word
            interaction.reply({
                content: `Are you sure you want to challenge \`${game.currentTrack.name}\`?`,
                components: getActionRow(buttons),
                ephemeral: true
            })
        }

    },
    buttons,
    purgeChallengesByGuild: guildId => {
        Object.keys(pendingChallenges).forEach(x => {
            if (x.startsWith(`${guildId}|`)) {
                delete pendingChallenges[x]
            }
        })
    },
    immediate: true
}
