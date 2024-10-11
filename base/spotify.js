/**
 * Spotify retrieval system
 * 
 * Author: Adam Seidman
 */

const fs = require('fs')
const log = require('./log')
const config = require('../client/config')
const { randomArrayItem, strip } = require('./helpers')
const SpotifyWebApi = require('spotify-web-api-node')

var spotifyApi = undefined
var accessToken = ''
const ACCESS_TOKEN_FILE = 'client/token.txt'

const makeTrack = rawTrack => {
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

const refreshSpotifyToken = () => {
    if (spotifyApi === undefined) return
    spotifyApi.refreshAccessToken().then(
        data => {
            spotifyApi.setAccessToken(data.body['access_token'])
            fs.writeFile(ACCESS_TOKEN_FILE, data.body['access_token'], err => {
                if (err) throw err
            })
        },
        err => {
            log.error('Could not refresh access token', null, err, true)
            throw err
        })
}

const start = async () => {
    if (spotifyApi !== undefined) {
        log.error('Tried to regenerate spotify API!')
        return
    }
    spotifyApi = new SpotifyWebApi({
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret
    })
    await spotifyApi.clientCredentialsGrant()
    fs.readFile(ACCESS_TOKEN_FILE, 'ascii', (err, data) => {
        if (err) throw err
        accessToken = data
        spotifyApi.setAccessToken(accessToken)
        spotifyApi.setRefreshToken(config.spotify.refreshToken)
        refreshSpotifyToken()
    })
    setInterval(refreshSpotifyToken, config.spotify.credentialUpdateInterval)
}

const getAllTracks = searchTerm => {
    let buf = []
    return new Promise((resolve, reject) => {
        if (spotifyApi === undefined || typeof searchTerm !== 'string') {
            reject(new Error('Invalid state in "getAllTracks".'))
        }
        else {
            let callback = data => {
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

const createPlaylist = (title, list, uri) => {
    if (title === undefined || typeof title !== 'string' || list === undefined || spotifyApi === undefined) return
    if (uri !== undefined && typeof uri !== 'string') return
    let playlistId = undefined
    return new Promise((resolve, reject) => {
        try {
            spotifyApi.createPlaylist(title, {
                description: 'Created automatically by Song-Chains. See https://github.com/AdamSeidman/Spotify-Guesser-Bot for more info',
                collaborative : false,
                public: true
            }).then(data => {
                playlistId = data.body.id
                return spotifyApi.addTracksToPlaylist( data.body.id, list.map(x => `spotify:track:${x.url.slice(x.url.lastIndexOf('/') + 1)}`) )
            }).then(() => {
                if (uri === undefined) {
                    resolve(`https://open.spotify.com/playlist/${playlistId}`)
                    return
                }
                var request = require('request').defaults({ encoding: null })
                uri = uri.split('.')
                uri[uri.length - 1] = 'png'
                request.get(uri.join('.'), (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        let base64Uri = Buffer.from(body).toString('base64')
                        spotifyApi.uploadCustomPlaylistCoverImage(playlistId, base64Uri).then(() => {
                            resolve(`https://open.spotify.com/playlist/${playlistId}`)
                        }).catch(reject)
                    }
                    else if (error) {
                        reject(error)
                    } else {
                        reject(response.statusCode)
                    }
                })
            }).catch(reject)
        }
        catch (err) {
            log.error(err)
            resolve()
        }
    })
}

const getTrack = (track, peek) => {
    let count = 0
    return new Promise((resolve, reject) => {
        if (spotifyApi === undefined || typeof track !== 'string') {
            reject(new Error('Invalid state in "getTrack".'))
            return
        }
        let callback = data => {
            count++
            let res = data.body.tracks.items.find(x => {
                return strip(x.name.toUpperCase().trim()) === strip(track.toUpperCase().trim()) && x.name.length > 0
            })
            if ( res !== undefined ) {
                resolve(makeTrack(res))
            }
            else if ((data.body.tracks.offset + data.body.tracks.limit) < data.body.tracks.total && !peek) {
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

const getTrackByArtist = track => {
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
            let potentialArtists = []
            if (artist.includes(',') || artist.includes('&')) {
                potentialArtists = artist.trim().split(' ').filter(x => x.length > 0).join(' ')
                potentialArtists = potentialArtists.split(',').filter(x => x.length > 0).join('&')
                potentialArtists = potentialArtists.split('&').filter(x => x.length > 0).map(x => x.trim().toUpperCase())
                if (potentialArtists.length > 10) {
                    potentialArtists = []
                }
            }
            let callback = data => {
                let res = data.body.tracks.items.find(x => {
                    if (strip(x.name.toUpperCase().trim()) !== strip(song.toUpperCase())) {
                        return false
                    }
                    if (strip(x.artists[0].name.toUpperCase().trim()) === strip(artist.toUpperCase())) {
                        return true
                    }
                    if (potentialArtists.length === 0) {
                        return false
                    }
                    while (potentialArtists.length > 0) {
                        let item = potentialArtists.shift()
                        if (undefined === x.artists.find(y => {
                            return strip(y.name.toUpperCase().trim()) === strip(item.toUpperCase())
                        })) {
                            return false
                        }
                    }
                    return true
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

const getRandomTrack = async () => {
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
                                    if (searchTerm === undefined || searchTerm.trim().length < 1) {
                                        searchTerm = originalSearchTerm
                                    }
                                    spotifyApi.searchTracks(searchTerm).then(final => {
                                        if (final.body.tracks.limit < 1) {
                                            resolve()
                                            return true
                                        }
                                        let foundTrack = undefined
                                        while (foundTrack === undefined) {
                                            foundTrack = randomArrayItem(final.body.tracks.items)
                                        }
                                        resolve(makeTrack(foundTrack))
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
            log.error(err)
        }
    }
    return track
}

const getFirstTrack = async (word, exclusions) => {
    let count = 0
    if (exclusions === undefined) {
        exclusions = []
    }
    return new Promise((resolve, reject) => {
        if (spotifyApi === undefined || typeof word !== 'string' || word.length === 0) resolve()
        let callback = data => {
            count++
            let res = data.body.tracks.items.find(x => {
                return x.name.includes(' ') && strip(x.name.toUpperCase()).split(' ').includes(strip(word).toUpperCase())
                    && !exclusions.includes(strip(x.name).toLowerCase())
            })
            if ( res !== undefined ) {
                resolve(makeTrack(res))
            }
            else if ((data.body.tracks.offset + data.body.tracks.limit) < data.body.tracks.total) {
                if (count >= config.options.maxSearchPages) {
                    resolve()
                }
                else {
                    spotifyApi.searchTracks(strip(word), {offset: (data.body.tracks.offset + data.body.tracks.limit)})
                        .then(callback, reject)
                }
            }
            else {
                resolve()
            }
        }
        spotifyApi.searchTracks(strip(word)).then(callback, reject)
    })
}

module.exports = {
    start,
    getAllTracks,
    getTrack,
    getTrackByArtist,
    getRandomTrack,
    getFirstTrack,
    createPlaylist
}
