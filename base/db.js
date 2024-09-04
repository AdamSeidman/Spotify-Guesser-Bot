/**
 * Load information on games
 * 
 * Author: Adam Seidman
 */

const sqlite3 = require('sqlite3').verbose()

const dbName = 'trackChains'
const savedGamesTable = 'SavedGames'
const savedImmHistoriesTable = 'ImmediateHistories'

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

module.exports = {
    getSavedGames,
    createGame,
    createHistory,
    updateGame,
    updateHistory,
    deleteGame,
    getSavedHistories
}
