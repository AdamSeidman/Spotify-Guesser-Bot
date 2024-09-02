/**
 * Hold game state
 * 
 * Author: Adam Seidman
 */

const spotify = require('./spotify')

var map = {}
var history = {}
const repeatGuesses = 50

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
        msg.reply("There is already a game going on!")
        return
    }
    let track = await spotify.getRandomTrack()
    game = {
        key: `#${msg.guild.id}`,
        guild: msg.guild,
        channel: msg.channel,
        lastMember: {
            id: 0
        },
        usedTracks: [getShortName(track)],
        currentTrack: track,
        count: 0,
    }
    hist = {
        key: `#${msg.guild.id}`,
        list: [track.full]
    }
    map[game.key] = game
    history[hist.key] = hist
    return track
}

var guess = function(msg, track) {
    let game = getGame(msg.guild.id)
    if (game === undefined) return "Unknown Error!"
    let ruinedMsg = `<@${msg.member.id}> RUINED IT AT **${game.count}**!!`
    if (game.lastMember.id === msg.member.id) {
        delete map[game.key]
        return [ruinedMsg, "**No going twice.**"]
    }
    if (track === undefined || track.artist === undefined) {
        delete map[game.key]
        return [ruinedMsg, "**Track not recognized.**"]
    }
    let shortName = getShortName(track)
    if (game.usedTracks.includes(shortName)) {
        delete map[game.key]
        return [ruinedMsg, `**No repeats within ${repeatGuesses} tracks.**`]
    }
    if (game.currentTrack.name.length > 0 && getShortName(game.currentTrack).split(' ').slice(-1)[0] !== shortName.split(' ')[0]) {
        delete map[game.key]
        return [ruinedMsg, "**Wrong word.**"]
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
    game.lastMember = msg.member
    game.count = game.count + 1
}

var getHistory = function(id) {
    return history[`#${id}`]
}

module.exports = {
    getGame,
    createGame,
    guess,
    getHistory
}
