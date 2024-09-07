/**
 * Spotify retrieval system
 * 
 * Author: Adam Seidman
 */

const config = require('../client/config')
const { randomArrayItem } = require('poop-sock')
const SpotifyWebApi = require('spotify-web-api-node')

var spotifyApi = undefined

var updateAccessToken = async function() {
    if (spotifyApi === undefined) {
        console.error('Undefined api when accessing token!')
        return
    }
    let credentials = await spotifyApi.clientCredentialsGrant()
    spotifyApi.setAccessToken(credentials.body.access_token)
    setTimeout(updateAccessToken, (credentials.body.expires_in * 500))
}

var start = function() {
    if (spotifyApi !== undefined) {
        console.error('Tried to regenerate spotify API!')
        return
    }
    spotifyApi = new SpotifyWebApi({
        clientId: config.clientId,
        clientSecret: config.clientSecret
    })
    updateAccessToken()
}

var getAllTracks = function(searchTerm) {
    let buf = []
    return new Promise((resolve, reject) => {
        if (spotifyApi === undefined || typeof searchTerm !== 'string') {
            reject(new Error('Invalid state in "getAllTracks".'))
        }
        else {
            let callback = function(data) {
                data.body.tracks.items.forEach(x => {
                    let item = {
                        full: `"${x.name}" - ${x.artists[0].name}`,
                        name: x.name,
                        artist: x.artists[0].name
                    }
                    if ( item.name.toUpperCase().includes(searchTerm.toUpperCase()) && item.full.length > 8 && buf.find(y => {
                        return y.full.toUpperCase() === item.full.toUpperCase()
                    }) === undefined ) {
                        buf.push(item)
                    }
                })
                if ((data.body.tracks.offset + data.body.tracks.limit) < data.body.tracks.total) {
                    spotifyApi.searchTracks(searchTerm, {offset:(data.body.tracks.offset + data.body.tracks.limit)})
                        .then(callback, reject)
                }
                else {
                    resolve(buf)
                }
            }
            spotifyApi.searchTracks(searchTerm).then(callback, reject)
        }
    })
}

var getTrack = function(track) {
    let count = 0
    return new Promise((resolve, reject) => {
        if (spotifyApi === undefined || typeof track !== 'string') {
            reject(new Error('Invalid state in "getTrack".'))
            return
        }
        let callback = function(data) {
            count++
            let res = data.body.tracks.items.find(x => {
                return x.name.toUpperCase() === track.toUpperCase() && x.name.length > 0
            })
            if ( res !== undefined ) {
                resolve({
                    full: `"${res.name}" - ${res.artists[0].name}`,
                    name: res.name,
                    artist: res.artists[0].name
                })
            }
            else if ((data.body.tracks.offset + data.body.tracks.limit) < data.body.tracks.total) {
                if (count >= config.options.maxSearchPages) {
                    resolve()
                }
                else {
                    spotifyApi.searchTracks(track, {offset:(data.body.tracks.offset + data.body.tracks.limit)})
                        .then(callback, reject)
                }
            }
            else {
                resolve()
            }
        }
        spotifyApi.searchTracks(track).then(callback, reject)
    })
}

var getRandomTrack = async function() {
    let track = undefined
    let subProcess = function() {
        let originalSearchTerm = randomArrayItem(config.randomTrackTerms)
        return new Promise((resolve, reject) => {
            spotifyApi.searchTracks(originalSearchTerm).then(x => {
                let calcOffset = Math.floor(Math.random() * (x.body.tracks.total - x.body.tracks.limit) + 1)
                spotifyApi.searchTracks(originalSearchTerm, {offset: calcOffset}).then(data => {
                    if (data.body.tracks.items.length < 1) {
                        resolve()
                    }
                    else {
                        data.body.tracks.items.find(y => {
                            let item = {
                                full: `"${y.name}" - ${y.artists[0].name}`,
                                name: y.name,
                                artist: y.artists[0].name
                            }
                            if (item.name.length > 10) {
                                let name = item.name.replace(originalSearchTerm, '').trim().split(' ')
                                if (name.length < 1) {
                                    resolve()
                                    return true
                                }
                                else {
                                    var searchTerm = name[Math.floor(Math.random() * name.length)]
                                    spotifyApi.searchTracks(searchTerm).then(final => {
                                        if (final.body.tracks.limit < 1) {
                                            resolve()
                                            return true
                                        }
                                        let song = final.body.tracks.items[0]
                                        resolve({
                                            full: `"${song.name}" - ${song.artists[0].name}`,
                                            name: song.name,
                                            artist: song.artists[0].name
                                        })
                                        return true
                                    }, reject)
                                }
                            }
                            return false
                        })
                    }
                }, reject)
            }, reject)
        })
    }
    while (track === undefined || track.artist === undefined || track.name.slice(-1).match(/[a-z]/i) === null) {
        track = await subProcess()
    }
    return track
}

module.exports = {
    start,
    getAllTracks,
    getTrack,
    getRandomTrack
}
