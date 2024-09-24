/**
 * Load information on games
 * 
 * Author: Adam Seidman
 */

const sqlite3 = require('sqlite3').verbose()
const { copyObject } = require('./helpers')
const config = require('../client/config')
const log = require('better-node-file-logger')
const Discord = require('discord.js')

const dbName = 'trackChains'
const savedGamesTable = 'SavedGames'
const serverRulesTable = 'ServerRules'
const savedPlaylistsTable = 'SavedPlaylists'
const challengeResultsTable = 'ChallengeResults'
const savedImmHistoriesTable = 'ImmediateHistories'
const permanentHistoriesTable = 'PermanentHistories'

var open = function() {
    return new sqlite3.Database(`${__dirname}\\..\\db\\${dbName}.db`)
}

var close = function(db) {
    if (db !== undefined) {
        db.close()
    }
}

var getSavedGames = function() {
    return new Promise((resolve, reject) => {
        let db = open()
        let results = {}
        db.each(`SELECT * FROM ${savedGamesTable}`, (err, row) => {
            if (err) {
                close(db)
                log.error('Select Error', err)
                reject(new Error('Select Error.'))
                return
            }
            else {
                try {
                    results[row.key] = JSON.parse(row.map)
                }
                catch (err) {
                    close(db)
                    log.error('Parse Error', err)
                    reject(new Error('Parse Error.'))
                    return
                }
            }
        }, () => {
            close(db)
            resolve(results)
        })
    })
}

var getSavedHistories = function() {
    return new Promise((resolve, reject) => {
        let db = open()
        let results = {}
        db.each(`SELECT * FROM ${savedImmHistoriesTable}`, (err, row) => {
            if (err) {
                close(db)
                log.error('Select Error', err)
                reject(new Error('Select Error.'))
                return
            }
            else {
                try {
                    results[row.key] = JSON.parse(row.map)
                }
                catch (err) {
                    close(db)
                    log.error('Parse Error', err)
                    reject(new Error('Parse Error.'))
                    return
                }
            }
        }, () => {
            close(db)
            resolve(results)
        })
    })
}

var createGame = function(game) {
    return new Promise((resolve, reject) => {
        let db = open()
        db.run(`INSERT INTO ${savedGamesTable} (key, map) VALUES (?, ?)`, [game.key, JSON.stringify(game)], err => {
            db.close()
            if (err) {
                log.error('Insert Error', err)
                reject(new Error('Insert Error.'))
            }
            else {
                resolve(game)
            }
        })
    })
}

var createHistory = function(history) {
    return new Promise((resolve, reject) => {
        let db = open()
        db.run(`INSERT INTO ${savedImmHistoriesTable} (key, map) VALUES (?, ?)`, [history.key, JSON.stringify(history)], err => {
            db.close()
            if (err) {
                log.error('Insert Error', err)
                reject(new Error('Insert Error.'))
            }
            else {
                resolve(history)
            }
        })
    })
}

var updateGame = function(game) {
    return new Promise((resolve, reject) => {
        let db = open()
        db.run(`UPDATE ${savedGamesTable} SET map=(?) WHERE key='${game.key}'`, [JSON.stringify(game)], err => {
            db.close()
            if (err) {
                log.error('Update Error', err)
                reject(new Error('Update Error.'))
            }
            else {
                resolve(game)
            }
        })
    })
}

var updateHistory = function(history) {
    return new Promise((resolve, reject) => {
        let db = open()
        db.run(`UPDATE ${savedImmHistoriesTable} SET map=(?) WHERE key='${history.key}'`, [JSON.stringify(history)], err => {
            db.close()
            if (err) {
                log.error('Update Error', err)
                reject(new Error('Update Error.'))
            }
            else {
                resolve(history)
            }
        })
    })
}

var deleteGame = function(game) {
    return new Promise((resolve, reject) => {
        let db = open()
        db.run(`DELETE FROM ${savedGamesTable} WHERE key='${game.key}'`, [], err => {
            db.close()
            if (err) {
                log.error('Delete Error', err)
                reject(new Error('Delete Error.'))
            }
            else {
                resolve(game)
            }
        })
    })
}

var historiesSetUp = false
var permanentHistories = {}
var storePermanentHistories = function() {
    if (historiesSetUp) return
    historiesSetUp = true
    return new Promise((resolve, reject) => {
        let db = open()
        db.each(`SELECT * FROM ${permanentHistoriesTable}`, (err, row) => {
            if (err) {
                close(db)
                log.error('Select Error', err)
                historiesSetUp = false
                reject(new Error('Select Error.'))
                return
            }
            else {
                try {
                    permanentHistories[row.key] = JSON.parse(row.map)
                }
                catch (err) {
                    close(db)
                    log.error('Parse Error.', err)
                    historiesSetUp = false
                    reject(new Error('Parse Error.'))
                    return
                }
            }
        }, () => {
            close(db)
            resolve(permanentHistories)
        })
    })
}

var challengesSetUp = false
var challengeResults = []
var storeChallengeResults = function() {
    if (challengesSetUp) return
    challengesSetUp = true
    return new Promise((resolve, reject) => {
        let db = open()
        db.each(`SELECT * FROM ${challengeResultsTable}`, (err, row) => {
            if (err) {
                close(db)
                log.error('Select Error.', err)
                challengesSetUp = false
                reject(new Error('Select Error.'))
                return
            }
            else {
                try {
                    challengeResults.push(JSON.parse(row.data))
                }
                catch (err) {
                    close(db)
                    log.error('Parse Error.', err)
                    challengesSetUp = false
                    reject(new Error('Parse Error.'))
                    return
                }
            }
        }, () => {
            resolve(challengeResults)
        })
    })
}

var playlistsSetUp = false
var savedPlaylists = {}
var storePlaylists = function() {
    if (playlistsSetUp) return
    playlistsSetUp = true
    return new Promise((resolve, reject) => {
        let db = open()
        db.each(`SELECT * FROM ${savedPlaylistsTable}`, (err, row) => {
            if (err) {
                close(db)
                log.error('Select Error.', err)
                playlistsSetUp = false
                reject(new Error('Select Error.'))
                return
            }
            else {
                savedPlaylists[row.key] = row.url
            }
        }, () => {
            resolve(savedPlaylists)
        })
    })
}

var getStoredPlaylists = async function() {
    await storePlaylists()
    return savedPlaylists
}

var storePlaylist = async function(key, url) {
    if (typeof key !== 'string' || typeof url !== 'string' || savedPlaylists[key] !== undefined) return
    await storePlaylists()
    savedPlaylists[key] = url
    let db = open()
    db.run(`INSERT INTO ${savedPlaylistsTable} (key, url) VALUES (?, ?)`, [key, url], err => {
        db.close()
        if (err) {
            log.error(err)
        }
    })
}

var serverRulesSetUp = false
var serverRules = {}
var storeServerRules = function() {
    if (serverRulesSetUp) return
    serverRulesSetUp = true
    return new Promise((resolve, reject) => {
        let db = open()
        db.each(`SELECT * FROM ${serverRulesTable}`, (err, row) => {
            if (err) {
                close(db)
                log.error('Select Error.', err)
                serverRulesSetUp = false
                reject(new Error('Select Error.'))
                return
            }
            else {
                try {
                    serverRules[row.key] = JSON.parse(row.data)
                }
                catch (err) {
                    close(db)
                    log.error('Parse Error.', err)
                    serverRulesSetUp = false
                    reject(new Error('Parse Error.'))
                    return
                }
            }
        }, () => {
            resolve(serverRules)
        })
    })
}

var getServerRules = async function(guildId) {
    if (guildId === undefined) return
    if (!serverRulesSetUp) {
        await storeServerRules()
    }
    return new Promise((resolve, reject) => {
        let key = `#${guildId}`
        if (serverRules[key]) {
            resolve(serverRules[key])
        }
        else {
            serverRules[key] = {
                key,
                prefix: '!',
                'challenges-allowed': true,
                'single-words-allowed': true,
                'shuffle-allowed': true,
                'challenge-first': false,
                'artist-required': false
            }
            let db = open()
            db.run(`INSERT INTO ${serverRulesTable} (key, data) VALUES (?, ?)`, [key, JSON.stringify(serverRules[key])], err => {
                db.close()
                if (err) {
                    log.error(err)
                    reject()
                }
                else {
                    resolve(serverRules[key])
                }
            })
        }
    })
}

var setServerRuleById = async function(guildId, id, value) {
    if (guildId === undefined || id === undefined || value === undefined) return
    if (!serverRulesSetUp) {
        await storeServerRules()
    }
    let rules = await getServerRules(guildId)
    let key = `#${guildId}`
    if (rules === undefined || rules[id] === value) return
    else {
        serverRules[key][id] = value
        return new Promise((resolve, reject) => {
            let db = open()
            db.run(`UPDATE ${serverRulesTable} SET data=(?) WHERE key='${key}'`, [JSON.stringify(serverRules[key])], err => {
                db.close()
                if (err) {
                    log.error(err)
                    reject(err)
                }
                else {
                    resolve()
                }
            })
        })
    }
}

var setChallengesAllowed = async function(guildId, allowed) {
    if (guildId === undefined || allowed === undefined) return
    await setServerRuleById(guildId, 'challenges-allowed', allowed)
}

var setShuffleAllowed = async function(guildId, allowed) {
    if (guildId === undefined || allowed === undefined) return
    await setServerRuleById(guildId, 'shuffle-allowed', allowed)
}

var setChallengeFirstAllowed = async function(guildId, allowed) {
    if (guildId === undefined || allowed === undefined) return
    await setServerRuleById(guildId, 'challenge-first', allowed)
}

var setArtistsRequired = async function(guildId, required) {
    if (guildId === undefined || required === undefined) return
    await setServerRuleById(guildId, 'artist-required', required)
}

var setSingleWordsAllowed = async function(guildId, allowed) {
    if (guildId === undefined || allowed === undefined) return
    await setServerRuleById(guildId, 'single-words-allowed', allowed)
}

var setServerPrefix = async function(guildId, prefix) {
    if (guildId === undefined || prefix === undefined) return
    await setServerRuleById(guildId, 'prefix', prefix)
}

var getGuildPreviousGames = async function(guildId) {
    if (guildId === undefined) return
    if (!historiesSetUp) {
        await storePermanentHistories()
    }
    let res = []
    Object.keys(permanentHistories).forEach(x => {
        if (permanentHistories[x].hist.key === `#${guildId}`) {
            res.push(permanentHistories[x])
        }
    })
    return res
}

var getChallengeResultsByUser = async function(userId) {
    if (userId === undefined) return
    if (!challengesSetUp) {
        await storeChallengeResults()
    }
    let res = {}
    challengeResults.forEach(x => {
        if (x.userId == userId) {
            if (res[x.guildId]) {
                if (x.success) { res[x.guildId].success += 1 }
                else { res[x.guildId].failure += 1 }
            }
            else {
                res[x.guildId] = {
                    success: x.success? 1 : 0,
                    failure: x.success? 0 : 1
                }
            }
        }
    })
    return res
}

var getChallengeResultsByGuild = async function(guildId) {
    if (guildId === undefined) return
    if (!challengesSetUp) {
        await storeChallengeResults()
    }
    let res = {}
    challengeResults.forEach(x => {
        if (x.guildId == guildId) {
            if (res[x.userId]) {
                if (x.success) { res[x.userId].success += 1 }
                else { res[x.userId].failure += 1 }
            }
            else {
                res[x.userId] = {
                    success: x.success? 1 : 0,
                    failure: x.success? 0 : 1
                }
            }
        }
    })
    return res
}

var makeChallengeResult = async function(guildId, userId, pass) {
    if (userId === undefined || guildId === undefined) return
    if (!challengesSetUp) {
        await storeChallengeResults()
    }
    return new Promise((resolve, reject) => {
        let data = {
            key: `${guildId}|${userId}`,
            success: pass? 1 : 0,
            failure: pass? 0 : 1,
            guildId,
            userId
        }
        challengeResults.push(data)
        let db = open()
        db.run(`INSERT INTO ${challengeResultsTable} (key, data) VALUES (?, ?)`, [data.key, JSON.stringify(data)], err => {
            db.close()
            if (err) {
                log.error('Insert Error', err)
                reject(new Error('Insert Error.'))
            }
            else {
                resolve(data)
            }
        })
    })
}

var makeHistoryPermanent = async function(history, memberId, ruinedReason) {
    if (!historiesSetUp) {
        await storePermanentHistories()
    }
    return new Promise((resolve, reject) => {
        let map = {
            hist: history,
            key: `x${Object.keys(permanentHistories).length}`,
            ruinedMemberId: memberId,
            ruinedText: ruinedReason
        }
        permanentHistories[map.key] = map
        let db = open()
        db.run(`INSERT INTO ${permanentHistoriesTable} (key, map) VALUES (?, ?)`, [map.key, JSON.stringify(map)], err => {
            if (err) {
                db.close()
                log.error('Insert Error', err)
                reject(new Error('Insert Error.'))
                return
            }
            else {
                db.run(`DELETE FROM ${savedImmHistoriesTable} WHERE key='${history.key}'`, [], err => {
                    db.close()
                    if (err) {
                        log.error('Delete Error', err)
                        reject(new Error('Delete Error.'))
                    }
                    else {
                        resolve(map)
                    }
                })
            }
        })
    })
}

var getAllGuessesByUser = async function(memberId) {
    if (!historiesSetUp) {
        await storePermanentHistories()
    }
    let curHistories = await getSavedHistories()
    if (curHistories === undefined) {
        curHistories = {}
    }
    return new Promise(resolve => {
        let buf = []
        let goodCheckFn = (list, key) => {
            list.forEach(track => {
                if (track.memberId == memberId) {
                    buf.push({
                        pass: true,
                        track,
                        guildId: key
                    })
                }
            })
        }
        Object.keys(permanentHistories).forEach(key => {
            goodCheckFn(permanentHistories[key].hist.list, permanentHistories[key].hist.key.slice(1))
            if (permanentHistories[key].ruinedMemberId == memberId) {
                buf.push({
                    pass: false,
                    ruinedReason: permanentHistories[key].ruinedText,
                    guildId: permanentHistories[key].hist.key.slice(1)
                })
            }           
        })
        Object.keys(curHistories).forEach(key => {
            goodCheckFn(curHistories[key].list, key.slice(1))
        })
        resolve(buf)
    })
}

var getAllGuessesByGuild = async function(guildId) {
    if (!historiesSetUp) {
        await storePermanentHistories()
    }
    let curHistories = await getSavedHistories()
    let curHistory = []
    if (curHistories !== undefined && curHistories[`#${guildId}`] !== undefined) {
        curHistory = curHistories[`#${guildId}`].list
    }
    return new Promise(resolve => {
        let buf = []
        let goodCheckFn = list => {
            list.forEach(track => {
                if (track.memberId != config.discord.botId) {
                    buf.push({
                        pass: true,
                        track,
                        memberId: track.memberId
                    })
                }
            })
        }
        Object.keys(permanentHistories).forEach(x => {
            if (permanentHistories[x].hist.key.slice(1) == guildId) {
                goodCheckFn(permanentHistories[x].hist.list)
                if (permanentHistories[x].ruinedMemberId) {
                    buf.push({
                        pass: false,
                        ruinedReason: permanentHistories[x].ruinedText,
                        memberId: permanentHistories[x].ruinedMemberId
                    })
                }
            }
        })
        goodCheckFn(curHistory)
        resolve(buf)
    })
}

var getAllScores = async function(guildId) {
    if (!historiesSetUp) {
        await storePermanentHistories()
    }
    if (!challengesSetUp) {
        await storeChallengeResults()
    }
    let playerMap = {}
    let inc = playerId => {
        if (playerId === undefined || playerId == config.discord.botId) return
        if (playerMap[Discord.userMention(playerId)] === undefined) {
            playerMap[Discord.userMention(playerId)] = 1
        } else {
            playerMap[Discord.userMention(playerId)] += 1
        }
    }
    let dec = playerId => {
        if (playerId === undefined || playerId == config.discord.botId) return
        if (playerMap[Discord.userMention(playerId)] === undefined) {
            playerMap[Discord.userMention(playerId)] = -1
        } else {
            playerMap[Discord.userMention(playerId)] -= 1
        }
    }
    Object.keys(permanentHistories).forEach(key => {
        if (guildId === undefined || permanentHistories[key].hist.key === `#${guildId}`) {
            permanentHistories[key].hist.list.forEach(track => {
                inc(track.memberId)
            })
            dec(permanentHistories[key].ruinedMemberId)
        }
    })
    challengeResults.forEach(x => {
        if (guildId === undefined || x.guildId == guildId) {
            if (x.success) {
                inc(x.userId)
            } else {
                dec(x.userId)
            }
        }
    })
    const historyCheckFn = hist => {
        hist.list.forEach(x => {
            inc(x.memberId)
        })
    }
    let histories = await getSavedHistories()
    if (guildId === undefined) {
        Object.keys(histories).forEach(key => {
            historyCheckFn(histories[key])
        })
    }
    else if (histories[`#${guildId}`] !== undefined) {
        historyCheckFn(histories[`#${guildId}`])
    }
    return playerMap
}

var getAllGuildHistories = async function(guildId) {
    if (guildId === undefined) return
    if (!historiesSetUp) {
        await storePermanentHistories()
    }
    let res = []
    Object.keys(permanentHistories).forEach(x => {
        if (permanentHistories[x].hist.key.slice(1) == guildId) {
            res.push(copyObject(permanentHistories[x]))
        }
    })
    return res.sort((a, b) => {
        return parseInt(a.key.slice(1)) - parseInt(b.key.slice(1))
    })
}

var getGuildMaxScores = async function() {
    if (!historiesSetUp) {
        await storePermanentHistories()
    }
    let map = {}
    Object.keys(permanentHistories).forEach(x => {
        let guildKey = permanentHistories[x].hist.key
        if (map[guildKey] === undefined) {
            map[guildKey] = {
                key: guildKey,
                score: permanentHistories[x].hist.list.length,
                name: permanentHistories[x].hist.guildName
            }
        }
        else if (permanentHistories[x].hist.list.length > map[guildKey].score) {
            map[guildKey].score = permanentHistories[x].hist.list.length
        }
    })
    let histories = await getSavedHistories()
    Object.keys(histories).forEach(key => {
        if (map[key] === undefined) {
            map[key] = {
                key,
                score: histories[key].list.length,
                name: histories[key].guildName
            }
        }
        else if (map[key].score < histories[key].list.length) {
            map[key].score = histories[key].list.length
        }
    })
    return map
}

module.exports = {
    getSavedGames,
    getSavedHistories,
    createGame,
    createHistory,
    updateGame,
    updateHistory,
    deleteGame,
    makeHistoryPermanent,
    getGuildPreviousGames,
    getAllGuessesByUser,
    getAllGuessesByGuild,
    getChallengeResultsByGuild,
    getChallengeResultsByUser,
    makeChallengeResult,
    getServerRules,
    setChallengesAllowed,
    setShuffleAllowed,
    setChallengeFirstAllowed,
    setArtistsRequired,
    setSingleWordsAllowed,
    setServerPrefix,
    getAllGuildHistories,
    getGuildMaxScores,
    getAllScores,
    getStoredPlaylists,
    storePlaylist
}
