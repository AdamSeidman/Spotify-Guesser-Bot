/**
 * Spotify retrieval system
 * 
 * Author: Adam Seidman
 */

const config = require('../client/config')
const { randomArrayItem } = require('poop-sock')
const SpotifyWebApi = require('spotify-web-api-node')

var spotifyApi = undefined

var makeTrack = function(rawTrack) {
    if (rawTrack === undefined || rawTrack.artists === undefined) return
    return {
        full: `"${rawTrack.name}" - ${rawTrack.artists[0].name}`,
        name: rawTrack.name,
        artist: rawTrack.artists[0].name,
        duration: rawTrack.duration_ms,
        id: rawTrack.id,
        url: rawTrack.external_urls.spotify,
        album: rawTrack.album.album_type === 'single'? undefined : rawTrack.album.name,
        releaseDate: rawTrack.album.release_date,
        popularity: rawTrack.popularity,
        images: rawTrack.album.images
    }
}

var setCredentials = async function() {
    try {
        let credentials = await spotifyApi.clientCredentialsGrant()
        spotifyApi.setAccessToken(credentials.body.access_token)
    }
    catch (err) {
        console.error('Could not set credentials!', err)
    }
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
    setCredentials()
    setInterval(setCredentials, config.options.credentialUpdateInterval)
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
                    let item = makeTrack(x)
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
                resolve(makeTrack(res))
            }
            else if ((data.body.tracks.offset + data.body.tracks.limit) < data.body.tracks.total) {
                if (count >= config.options.maxSearchPages) {
                    resolve()
                }
                else {
                    spotifyApi.searchTracks(track, {offset: (data.body.tracks.offset + data.body.tracks.limit)})
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

var getTrackByArtist = function(track) {
    return new Promise((resolve, reject) => {
        if (typeof track !== 'string' || !track.includes('-')) {
            resolve()
        }
        else if (spotifyApi === undefined) {
            reject(new Error('Invalid state in "getTrackByArtist".'))
        }
        else {
            let song = track.slice(0, track.lastIndexOf('-')).trim()
            let artist = track.slice(track.lastIndexOf('-') + 1).trim()
            let callback = function(data) {
                let res = data.body.tracks.items.find(x => {
                    return x.name.toUpperCase() === song.toUpperCase() && x.artists[0].name.toUpperCase() === artist.toUpperCase()
                })
                if ( res !== undefined ) {
                    resolve(makeTrack(res))
                }
                else if ((data.body.tracks.offset + data.body.tracks.limit) < data.body.tracks.total) {
                    spotifyApi.searchTracks(track, {offset: (data.body.tracks.offset + data.body.tracks.limit)})
                        .then(callback, reject)
                }
                else {
                    resolve()
                }
            }
            spotifyApi.searchTracks(track).then(callback, reject)
        }
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
                            let item = makeTrack(y)
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
                                        resolve(makeTrack(final.body.tracks.items[0]))
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
        try {
            track = await subProcess()
        }
        catch (err) {
            track = undefined
            console.error(err)
        }
    }
    return track
}

module.exports = {
    start,
    getAllTracks,
    getTrack,
    getTrackByArtist,
    getRandomTrack
}
