/**
 * Load information on games
 * 
 * Author: Adam Seidman
 */

const sqlite3 = require('sqlite3').verbose()

const dbName = 'trackChains'
const savedGamesTable = 'SavedGames'
const serverRulesTable = 'ServerRules'
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
                console.error(err)
                reject(new Error('Select Error.'))
                return
            }
            else {
                try {
                    results[row.key] = JSON.parse(row.map)
                }
                catch (err) {
                    close(db)
                    console.error(err)
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
                console.error(err)
                reject(new Error('Select Error.'))
                return
            }
            else {
                try {
                    results[row.key] = JSON.parse(row.map)
                }
                catch (err) {
                    close(db)
                    console.error(err)
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
                console.error(err)
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
                console.error(err)
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
                console.error(err)
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
                console.error(err)
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
                console.error(err)
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
                console.error(err)
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
                    console.error(err)
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
var challengeResults = {}
var storeChallengeResults = function() {
    if (challengesSetUp) return
    challengesSetUp = true
    return new Promise((resolve, reject) => {
        let db = open()
        db.each(`SELECT * FROM ${challengeResultsTable}`, (err, row) => {
            if (err) {
                close(db)
                console.error(err)
                challengesSetUp = false
                reject(new Error('Select Error.'))
                return
            }
            else {
                try {
                    challengeResults[row.key] = JSON.parse(row.data)
                }
                catch (err) {
                    close(db)
                    console.error(err)
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
                console.error(err)
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
                    console.error(err)
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
                'single-words-allowed': false
            }
            let db = open()
            db.run(`INSERT INTO ${serverRulesTable} (key, data) VALUES (?, ?)`, [key, JSON.stringify(serverRules[key])], err => {
                db.close()
                if (err) {
                    console.error(err)
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
                    console.error(err)
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

var getChallengeResultsByPlayer = async function(playerId) {
    if (playerId === undefined) return
    if (!challengesSetUp) {
        await storeChallengeResults()
    }
    let res = {}
    Object.keys(challengeResults).forEach(x => {
        let key = x.slice(x.indexOf('|') + 1)
        if (key == playerId) {
            if (res[key]) {
                if (challengeResults[x].success) { res[key].success += 1 }
                else { res[key].failure += 1 }
            }
            else if (challengeResults[x].success) {
                res[key] = {
                    key,
                    success: 1,
                    failure: 0
                }
            }
            else {
                res[key] = {
                    key,
                    success: 0,
                    failure: 1
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
    Object.keys(challengeResults).forEach(x => {
        let key = x.slice(0, x.indexOf('|'))
        if (key == guildId) {
            if (res[key]) {
                if (challengeResults[x].success) { res[key].success += 1 }
                else { res[key].failure += 1 }
            }
            else if (challengeResults[x].success) {
                res[key] = {
                    key,
                    success: 1,
                    failure: 0
                }
            }
            else {
                res[key] = {
                    key,
                    success: 0,
                    failure: 1
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
            failure: pass? 0 : 1
        }
        challengeResults[data.key] = data
        let db = open()
        db.run(`INSERT INTO ${challengeResultsTable} (key, data) VALUES (?, ?)`, [data.key, JSON.stringify(data)], err => {
            db.close()
            if (err) {
                console.error(err)
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
                console.error(err)
                reject(new Error('Insert Error.'))
                return
            }
            else {
                db.run(`DELETE FROM ${savedImmHistoriesTable} WHERE key='${history.key}'`, [], err => {
                    db.close()
                    if (err) {
                        console.error(err)
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

var getAllGuesses = async function(memberId) {
    if (!historiesSetUp) {
        await storePermanentHistories()
    }
    return new Promise(resolve => {
        let buf = []
        Object.keys(permanentHistories).forEach(key => {
            permanentHistories[key].hist.list.forEach(track => {
                if (track.memberId == memberId) {
                    buf.push({
                        pass: true,
                        track: track,
                        guildId: permanentHistories[key].hist.key.slice(1)
                    })
                }
            })
            if (permanentHistories[key].ruinedMemberId == memberId) {
                buf.push({
                    pass: false,
                    ruinedReason: permanentHistories[key].ruinedText,
                    guildId: permanentHistories[key].hist.key.slice(1)
                })
            }           
        })
        resolve(buf)
    })
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
    getAllGuesses,
    getChallengeResultsByGuild,
    getChallengeResultsByPlayer,
    makeChallengeResult,
    getServerRules,
    setChallengesAllowed,
    setSingleWordsAllowed,
    setServerPrefix
}
