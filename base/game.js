/**
 * Hold game state
 * 
 * Author: Adam Seidman
 */

const db = require('./db')
const spotify = require('./spotify')

var map = {}
var history = {}
const repeatGuesses = 50

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

var getShortName = function(track) {
    return track.name.trim().toLowerCase()
}

var createGame = async function(msg) {
    if (msg === undefined) {
        return
    }
    let game = getGame(msg.guild.id)
    if (game !== undefined) {
        msg.reply('There is already a game going on!')
        return
    }
    let track = await spotify.getRandomTrack()
    game = {
        key: `#${msg.guild.id}`,
        channelId: msg.channel.id,
        lastMemberId: 0,
        usedTracks: [getShortName(track)],
        currentTrack: track,
        count: 0,
    }
    let hist = {
        key: `#${msg.guild.id}`,
        list: [track.full]
    }
    map[game.key] = game
    history[hist.key] = hist
    db.createHistory(hist)
    db.createGame(game)
    return track
}

var closeGame = async function(game, memberId, ruinedReason) {
    if (game === undefined) return
    await db.deleteGame(game)
    await db.makeHistoryPermanent(history[game.key], memberId, ruinedReason)
    delete map[game.key]
}

var guess = async function(msg, track) {
    let game = getGame(msg.guild.id)
    if (game === undefined) return 'Unknown Error!'
    let ruinedMsg = `<@${msg.member.id}> RUINED IT AT **${game.count}**!!`
    if (game.lastMemberId === msg.member.id) {
        await closeGame(game)
        return [ruinedMsg, '**No going twice.**']
    }
    if (track === undefined || track.artist === undefined) {
        await closeGame(game)
        return [ruinedMsg, '**Track not recognized.**']
    }
    let shortName = getShortName(track)
    if (shortName.split(' ').length <= 1) {
        await closeGame(game)
        return [ruinedMsg, '**No single words.**']
    }
    if (game.usedTracks.includes(shortName)) {
        await closeGame(game)
        return [ruinedMsg, `**No repeats within ${repeatGuesses} tracks.**`]
    }
    if (game.currentTrack.name.length > 0 && getShortName(game.currentTrack).split(' ').slice(-1)[0] !== shortName.split(' ')[0]) {
        await closeGame(game)
        return [ruinedMsg, '**Wrong word.**']
    }
    game.usedTracks.push( getShortName(track) )
    history[game.key].list.push({
        ...track,
        memberId: msg.member.id
    })
    if (game.usedTracks.length > repeatGuesses) {
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
        msg.reply('You cannot shuffle once the chain has started!')
        return
    }
    delete map[game.key]
    let track = await createGame(msg)
    if (track === undefined || track.artist === undefined) {
        msg.reply('Oops, I deleted your game! :(')
    }
    else {
        msg.reply(`New track picked! Start with \`${track.full}\` (next word \`${track.name.toLowerCase().split(' ').slice(-1)[0]}\`).`)
    }
}

module.exports = {
    initGames,
    getGame,
    createGame,
    guess,
    getHistory,
    shuffle
}
