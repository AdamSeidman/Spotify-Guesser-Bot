/**
 * Statistics handling and sub-commands.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const Discord = require('discord.js')
const config = require('../../client/config')
const { getPercentage, escapeDiscordString } = require('../helpers')

var showUserStats = async function(interaction) {
    let user = {
        id: interaction.member.id,
        username: interaction.member.user.username,
        avatar: interaction.member.displayAvatarURL()
    }
    let args = interaction.options.getUser('user')
    if (args !== null) {
        if (args.bot) {
            interaction.editReply('Cannot get statistics for a bot!')
            return
        }
        user.id = args.id
        user.username = args.username
        user.avatar = args.displayAvatarURL()
    }
    let globalCorrect = 0, guildCorrect = 0
    let globalIncorrect = 0, guildIncorrect = 0
    let guessBuf = []
    let guesses = await db.getAllGuessesByUser(user.id)
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
    let challenges = await db.getChallengeResultsByUser(user.id)
    let globalChallenges = {
        success: 0,
        failure: 0
    }
    let guildChallenges = challenges[`${interaction.guild.id}`]
    if (guildChallenges === undefined) {
        guildChallenges = {
            success: 0,
            failure: 0
        }
    }
    Object.keys(challenges).forEach(x => {
        globalChallenges.success += challenges[x].success
        globalChallenges.failure += challenges[x].failure
    })

    let globalChallengeRateText = `\nChallenge Rate: **${
        globalChallenges.success
    }/${
        globalChallenges.success + globalChallenges.failure
    }**`
    let guildChallengeRateText = `\nChallenge Rate: **${
        guildChallenges.success
    }/${
        guildChallenges.success + guildChallenges.failure
    }**`
    let rules = await db.getServerRules(interaction.guild.id)
    if (rules === undefined || !rules['challenges-allowed']) {
        guildChallengeRateText = ''
        if (globalChallengeRateText.endsWith('/0')) {
            globalChallengeRateText = ''
        }
    }

    let globalStats = `Correct: **${globalCorrect}**
        Incorrect: **${globalIncorrect}**
        Correct Rate: **${getPercentage(globalCorrect, guesses.length)}**${globalChallengeRateText}
        Score: **${globalCorrect + globalChallenges.success - globalIncorrect - globalChallenges.failure}**`
    let guildStats = `Correct: **${guildCorrect}**
        Incorrect: **${guildIncorrect}**
        Correct Rate: **${getPercentage(guildCorrect, (guildCorrect + guildIncorrect))}**${guildChallengeRateText}
        Score: **${guildCorrect + guildChallenges.success - guildIncorrect - guildChallenges.failure}**`
    let fields = [
        {name: 'Global Stats', value: globalStats, inline: true},
        {name: `Stats for \`${escapeDiscordString(interaction.guild.name)}\``, value: guildStats, inline: true},
        {name: 'Favorite Song', value: `_${escapeDiscordString(favoriteSong)}_`}
    ]
    let userStatEmbed = new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle('User Stats')
        .setAuthor({ name: user.username, iconURL: user.avatar })
        .addFields(...fields)
    interaction.editReply({embeds: [userStatEmbed]})
}

var showGuildStats = async function(interaction) {
    let fields = []
    let maxScores = await db.getGuildMaxScores()
    let valueArray = []
    Object.keys(maxScores).forEach(x => {
        let map = {}
        map[x] = maxScores[x].score - 1
        valueArray.push({
            key: x,
            score: maxScores[x].score - 1
        })
    })
    valueArray.sort((a, b) => {
        let scoreA = a[Object.keys(a)[0]]
        let scoreB = b[Object.keys(b)[0]]
        return scoreB - scoreA
    })
    let rank = -2
    valueArray.find((x, i) => {
        if (x.key === `#${interaction.guild.id}`) {
            rank = i
            return true
        }
    })
    rank++
    fields.push({
        name: 'Global Rank',
        value: `#${rank} of ${valueArray.length}`,
        inline: true
    })
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
        interaction.editReply({ content: 'No games have been played in this server yet!' }) // TODO check if challenges are allowed
        return
    }    
    fields.push({
        name: 'Longest Chain',
        value: `${histories[idx].hist.list.length} (Round #${idx + 1})`,
        inline: true
    })
    let challengeResults = await db.getChallengeResultsByGuild(interaction.guild.id)
    let challengesUserText = ''
    if (typeof challengeResults === 'object' && Object.keys(challengeResults).length > 0) {
        let successes = 0
        let failures = 0
        let userId = undefined
        let max = -1
        Object.keys(challengeResults).forEach(x => {
            let item = challengeResults[x]
            if (!isNaN(item.success)) {
                successes += item.success
                if (item.success > max) {
                    userId = x
                    max = item.success
                }
            }
            if (!isNaN(item.failure)) {
                failures += item.failure
            }
        })
        if (successes > 0 || failures > 0) {
            fields.push({
                name: 'Challenge Rate',
                value: `${successes}/${successes + failures}`,
                inline: true
            })
            if (max >= 0) {
                challengesUserText = `<@${userId}> (${max})`
            }
        }
    }
    let allGueses = await db.getAllGuessesByGuild(interaction.guild.id)
    let accuracies = {}
    allGueses.forEach(guess => {
        if (accuracies[guess.memberId] === undefined) {
            accuracies[guess.memberId] = {
                successes: 0,
                failures: 0,
                memberId: guess.memberId
            }
        }
        if (guess.pass) {
            accuracies[guess.memberId].successes++
        } else {
            accuracies[guess.memberId].failures++
        }
    })
    let maxAcc = -1
    let accKey = -1
    let maxSuccesses = -1
    Object.keys(accuracies).forEach(x => {
        if (accuracies[x].memberId !== undefined) {
            let accuracy = accuracies[x].successes / (accuracies[x].successes + accuracies[x].failures)
            if (accuracy > maxAcc || (accuracy == maxAcc && accuracies[x].successes > maxSuccesses)) {
                maxAcc = accuracy
                accKey = x
                maxSuccesses = accuracies[x].successes
            }
        }
    })
    fields.push({
        name: 'Most Accurate Player',
        value: `<@${
            accuracies[accKey].memberId
        }> - ${
            getPercentage(accuracies[accKey].successes, (accuracies[accKey].successes + accuracies[accKey].failures))
        } (${accuracies[accKey].successes}/${
            (accuracies[accKey].successes + accuracies[accKey].failures)
        })`
    })
    maxSuccesses = -1
    let maxFailures = -1
    let biggestLoserId = 0
    let biggestWinnerId = 0
    Object.keys(accuracies).forEach(x => {
        if (accuracies[x].memberId !== undefined) {
            if (accuracies[x].successes > maxSuccesses) {
                maxSuccesses = accuracies[x].successes
                biggestWinnerId = x
            }
            if (accuracies[x].failures > maxFailures) {
                maxFailures = accuracies[x].failures
                biggestLoserId = x
            }
        }
    })
    fields.push({
        name: 'Most Correct Contributions',
        value: `<@${biggestWinnerId}> (${maxSuccesses})`
    })
    fields.push({
        name: 'Most Incorrect Contributions',
        value: `<@${biggestLoserId}> (${maxFailures})`
    })
    if (challengesUserText.length > 0) {
        fields.push({
            name: 'Most Successful Challenger',
            value: challengesUserText
        })
    }
    let songChoices = {}
    allGueses.forEach(guess => {
        if (guess.pass && guess.memberId != undefined) {
            let key = guess.track.full
            if (songChoices[key] === undefined) {
                songChoices[key] = 1
            } else {
                songChoices[key]++
            }
        }
    })
    let songBuf = []
    Object.keys(songChoices).forEach(x => {
        songBuf.push({
            full: x,
            score: songChoices[x]
        })
    })
    songBuf.sort((a, b) => {
        return b.score - a.score
    })
    if (songBuf.length > config.options.maxGuildFavoriteSongs) {
        songBuf = songBuf.slice(0, config.options.maxGuildFavoriteSongs)
    }
    if (songBuf.length > 0) {
        let favoriteSongs = []
        songBuf.forEach((x, i) => {
            favoriteSongs.push(`${i + 1}. ${x.full}`)
        })
        fields.push({
            name: 'Favorite Songs',
            value: favoriteSongs.join('\n')
        })
    }
    let guildStatEmbed = new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(`Server Stats for \`${escapeDiscordString(interaction.guild.name)}\``)
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp()
        .addFields(...fields)
    interaction.editReply({embeds: [guildStatEmbed]})
}

const subCommands = {
    user: showUserStats,
    server: showGuildStats
}

module.exports = {
    phrase: 'stats',
    data: new Discord.SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show statistics for song chains.')
        .addSubcommand(subcommand => 
            subcommand
                .setName('user')
                .setDescription('Show user statistics.')
                .addUserOption(option => 
                    option
                        .setName('user')
                        .setDescription('User to get stats of.')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Show server statistics.')
        ),
    execute: async interaction => {
        let sub = interaction.options.getSubcommand()
        if ( typeof sub !== 'string' || subCommands[sub] === undefined ) {
            interaction.reply({ content: 'Could not find stats sub-command!', ephemeral: true })
        }
        await interaction.deferReply()
        subCommands[sub](interaction)
    },
    immediate: true
}
