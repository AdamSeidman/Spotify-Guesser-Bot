/**
 * Hold game state
 * 
 * Author: Adam Seidman
 */

const db = require('./db')
const spotify = require('./spotify')
const Discord = require('discord.js')
const config = require('../client/config')
const log = require('better-node-file-logger')
const { strip, escapeDiscordString } = require('./helpers')

var map = {}
var history = {}

var initGames = async function() {
    let cachedHistories = await db.getSavedHistories()
    let cachedGames = await db.getSavedGames()
    if (cachedHistories === undefined) return
    Object.keys(cachedHistories).forEach(x => {
        history[x] = cachedHistories[x]
    })
    if (cachedGames !== undefined) {
        Object.keys(cachedHistories).forEach(x => {
            if (cachedGames[x] !== undefined) {
                map[x] = cachedGames[x]
            }
        })
    }
}

var getGame = function(id) {
    return map[`#${id}`]
}

var getTrack = function(gameKey, num) {
    if (typeof gameKey !== 'string' || typeof num !== 'number') return
    let hist = history[gameKey]
    if (hist === undefined || hist.list === undefined) return
    return hist.list[num]
}

var getShortName = function(track) {
    return strip(track.name).trim().toLowerCase()
}

var createGame = async function(msg, channelId) {
    if (msg === undefined) {
        return
    }
    let game = getGame(msg.guild.id)
    if (game !== undefined) {
        log.warn('Tried to create a game twice?')
        msg.reply('There is already a game going on!')
        return
    }
    let track = await spotify.getRandomTrack()
    game = {
        key: `#${msg.guild.id}`,
        channelId: channelId || msg.channel.id,
        lastMemberId: 0,
        usedTracks: [getShortName(track)],
        currentTrack: track,
        count: 0,
    }
    let hist = {
        key: `#${msg.guild.id}`,
        list: [track],
        guildName: escapeDiscordString(msg.guild.name)
    }
    map[game.key] = game
    history[hist.key] = hist
    db.createHistory(hist)
    db.createGame(game)
    return track
}

var addBotTrack = async function(msg) {
    if (msg === undefined) return
    let game = getGame(msg.guild.id)
    if (game === undefined) return
    let track = await spotify.getRandomTrack()
    game.usedTracks.push( getShortName(track) )
    history[game.key].list.push({
        ...track,
        memberId: config.discord.botId
    })
    if (game.usedTracks.length > config.options.minRepeatGuesses) {
        game.usedTracks.shift()
    }
    game.currentTrack = track
    game.lastMemberId = config.discord.botId
    game.count = game.count + 1
    await db.updateGame(game)
    await db.updateHistory(history[game.key])
    return track
}

var closeGame = async function(game, memberId, ruinedReason) {
    if (game === undefined) return
    await db.deleteGame(game)
    await db.makeHistoryPermanent(history[game.key], memberId, ruinedReason)
    delete map[game.key]
}

var failure = async function(msg, failureReason) {
    if (msg === undefined || failureReason === undefined) return
    let game = getGame(msg.guild.id)
    if (game !== undefined) {
        await closeGame(game, msg.member.id, `${Discord.bold(failureReason)}`)
    }
}

var guess = async function(msg, track) {
    let game = getGame(msg.guild.id)
    if (game === undefined) return 'Unknown Error!'
    let rules = await db.getServerRules(msg.guild.id)
    let ruinedMsg = `${Discord.userMention(msg.member.id)} RUINED IT AT ${Discord.bold(game.count)}!!`
    if (game.lastMemberId === msg.member.id) {
        let ruinedReason = Discord.bold('No going twice.')
        await closeGame(game, msg.member.id, ruinedReason)
        return [ruinedMsg, ruinedReason]
    }
    if (track === undefined || track.artist === undefined) {
        let ruinedReason = Discord.bold('Track not recognized.')
        await closeGame(game, msg.member.id, ruinedReason)
        return [ruinedMsg, ruinedReason]
    }
    let shortName = getShortName(track)
    if (shortName.split(' ').length <= 1 && !rules['single-words-allowed']) {
        let ruinedReason = Discord.bold('No single words.')
        await closeGame(game, msg.member.id, ruinedReason)
        return [ruinedMsg, ruinedReason]
    }
    if (game.usedTracks.includes(shortName)) {
        let ruinedReason = Discord.bold(`No repeats within ${config.options.minRepeatGuesses} tracks.`)
        await closeGame(game, msg.member.id, ruinedReason)
        return [ruinedMsg, ruinedReason]
    }
    if (game.currentTrack.name.length > 0 && getShortName(game.currentTrack).split(' ').slice(-1)[0] !== shortName.split(' ')[0]) {
        let ruinedReason = Discord.bold('Wrong word.')
        await closeGame(game, msg.member.id, ruinedReason)
        return [ruinedMsg, ruinedReason]
    }
    game.usedTracks.push( getShortName(track) )
    history[game.key].list.push({
        ...track,
        memberId: msg.member.id
    })
    if (game.usedTracks.length > config.options.minRepeatGuesses) {
        game.usedTracks.shift()
    }
    game.currentTrack = track
    game.lastMemberId = msg.member.id
    game.count = game.count + 1
    await db.updateGame(game)
    await db.updateHistory(history[game.key])
}

var getHistory = function(id) {
    return history[`#${id}`]
}

var shuffle = async function(msg) {
    let game = getGame(msg.guild.id)
    if (game === undefined || msg.channel === undefined || `${msg.channel.id}` !== `${game.channelId}`) {
        msg.reply('There is no game going on.')
        return
    }
    else if (game.count > 0) {
        msg.reply({content: 'You cannot shuffle once the chain has started!', ephemeral: true})
        return
    }
    delete map[game.key]
    let track = await createGame(msg)
    if (track === undefined || track.artist === undefined) {
        log.error('Deleted a game?', msg.guild.id)
        msg.reply('Oops, I deleted your game! :(')
    }
    else {
        msg.reply(`New track picked! Start with \`${track.full}\` (next word \`${track.name.toLowerCase().split(' ').slice(-1)[0]}\`).`)
    }
}

var changeChannel = async function(msg, channel) {
    if (msg === undefined || channel === undefined) return
    let game = getGame(msg.guild.id)
    if (channel === undefined) {
        log.warn('Unknown channel', channel)
        msg.reply({content: 'Error! Could not find channel!', ephemeral: true})
    } else if (game) {
        game.channelId = channel.id
        await db.updateGame(game)
        return false
    }
    else {
        let track = await createGame(msg, channel.id)
        log.info('Started first game in new server!', msg.guild.name)
        channel.send(`Start the game with \`${track.full}\` (next word \`${track.name.toLowerCase().split(' ').slice(-1)[0]}\`).`)
        return true
    }
}

module.exports = {
    initGames,
    getGame,
    getTrack,
    createGame,
    guess,
    getHistory,
    shuffle,
    changeChannel,
    failure,
    addBotTrack
}
