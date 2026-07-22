/* spotify.js NEW! */
require('dotenv').config();
const axios = require('axios');
const { performance } = require('perf_hooks');
const log = require('./log');

/* === Items included for backwards compatibility === */
const config = require('../client/config');
const { randomArrayItem, strip, isDirty } = require('./helpers');
const RANDOM_TRACK_TERMS = Object.freeze(config.randomTrackTerms);
const randomNumber = (min=1, max=99) => Math.floor(Math.random() * (max - min + 1)) + min;
const calculatedMaxTracks = 100;//250;//(config.options?.maxSearchPages || 25) * 20; // TODO Checked with 500. 900 before?
/* ================================================== */

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const PAGE_SIZE = 10;
const DEFAULT_MAX_TRACKS = calculatedMaxTracks || 500;
const SPOTIFY_ABS_MAX_TRACKS = 1000;
const DEFAULT_RANDOM_PAGE_RANGE = config.options?.defaultRandomPageRange || 5;
const SPOTIFY_PING_URL = 'https://api.spotify.com/v1/tracks/6h9hvYku9LclXahw9OvWuB';
const MAX_CACHE_ENTRIES = config.options?.maxCacheEntries || 50000;
const CACHE_ENTRY_TTL = config.options?.cacheEntryTTL || (3 * 24 * 60 * 60 * 1000);

let cachedToken = null;
let tokenPromise = null;
let tokenExpirationTime = 0;

class Track {
    constructor (spotifyTrack) {
        if (!spotifyTrack) {
            throw new Error('No spotify track provided!');
        }
        this.artist = spotifyTrack.artists?.[0]?.name || "";
        this.name = spotifyTrack.name || "";
        this.full = `"${this.name}" - ${this.artist}`;
        this.duration = spotifyTrack.duration_ms;
        this.id = spotifyTrack.id;
        this.url = spotifyTrack.external_urls?.spotify;
        this.album = (spotifyTrack.album?.album_type === 'single')? undefined : spotifyTrack.album?.name;
        this.releaseDate = spotifyTrack.album?.release_date;
        this.popularity = spotifyTrack.popularity;
        this.images = spotifyTrack.album?.images || [];
        if ( spotifyTrack.artists !== undefined && spotifyTrack.artists.length > 1 ) {
            this.fullArtistList = spotifyTrack.artists.map(x => x.name);
        } else {
            this.fullArtistList = undefined; // TODO single item?
        }
    }

    get hasFullArtistList() {
        return this.fullArtistList !== null;
    }
}

function setCache(cache, key, value) {
    if (cache.has(key)) {
        cache.delete(key);
    }
    if (cache.size >= MAX_CACHE_ENTRIES) {
        log.warn('Warning: Cache overflow! Key:', key, true);
        cache.delete(cache.keys().next().value);
    }
    cache.set(key, {
        value,
        expires: Date.now() + CACHE_ENTRY_TTL,
    });
}

function getCache(cache, key) {
    const entry = cache.get(key);
    if (!entry) return undefined;

    if (Date.now() >= entry.expires) {
        cache.delete(key);
        return undefined;
    }

    cache.delete(key);
    cache.set(key, entry);
    return entry.value;
}

function getAccessToken() {
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const now = Date.now();
    
    if (cachedToken && now < tokenExpirationTime - 60000) {
        return Promise.resolve(cachedToken);
    } else if (!tokenPromise) {
        tokenPromise = (async () => {
            try {
                const response = await axios.post(
                    tokenUrl,
                    new URLSearchParams({ grant_type: 'client_credentials' }),
                    {
                        headers: {
                            'Authorization': `Basic ${credentials}`,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        }
                    },
                );

                cachedToken = response.data.access_token;
                const expiresInMs = (response.data.expires_in || 3600) * 1000;
                tokenExpirationTime = Date.now() + expiresInMs;

                return cachedToken;
            } catch (error) {
                log.error('Error obtaining access token:', error.message, error, true);
                throw error;
            } finally {
                tokenPromise = null;
            }
        })();
    }
    return tokenPromise;
}

async function pingMillis() {
    try {
        const token = await getAccessToken();
        const start = performance.now();
        await axios.get(SPOTIFY_PING_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return performance.now() - start;
    } catch {
        return -1;
    }
}

const rawSearchCache = new Map();
const pendingRawSearches = new Map();
async function searchTracksRaw(query, page=0, limit=PAGE_SIZE) {
    const key = `${query}|${page}|${limit}`;
    const cachedEntry = getCache(rawSearchCache, key);
    if (cachedEntry) {
        return cachedEntry;
    }
    if (pendingRawSearches.has(key)) {
        return pendingRawSearches.get(key);
    }
    const promise = (async () => {
        const searchUrl = 'https://api.spotify.com/v1/search';
        const searchType = 'track';
        try {
            const token = await getAccessToken();
            const response = await axios.get(searchUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                params: {
                    q: query,
                    type: searchType,
                    limit,
                    offset: (page * limit),
                },
            });
            if (!response?.data) {
                throw new Error('No/invalid data returned!');
            } else {
                setCache(rawSearchCache, key, response.data);
                return response.data;
            }
        } finally {
            pendingRawSearches.delete(key);
        }
    })();
    pendingRawSearches.set(key, promise);
    return promise;
}

function getRawSearchPromises(query, maxTracks=0) {
    if (maxTracks <= 0) return [];
    maxTracks = Math.min(maxTracks, SPOTIFY_ABS_MAX_TRACKS);
    if (typeof query !== 'string' || query.length < 1) return [];
    const totalPages = Math.ceil(maxTracks / PAGE_SIZE);
    return Array.from({ length: totalPages }, (_, i) => searchTracksRaw(query, i,
        (i === totalPages - 1 && maxTracks % PAGE_SIZE > 0)? (maxTracks % PAGE_SIZE) : PAGE_SIZE)
    );
}

async function searchTracks(query, maxTracks=DEFAULT_MAX_TRACKS) {
    const tracksFound = [];
    try {
        const promises = getRawSearchPromises(query, maxTracks);
        for (let promise of promises) {
            const response = await promise;
            if (Array.isArray(response?.tracks?.items)) {
                tracksFound.push(...(response.tracks.items).map(x => new Track(x)));
            }
        }
        return tracksFound;
    } catch (error) {
        log.error(`Error in track search (Found ${tracksFound.length}):`, error.message, error, true);
        if (tracksFound.length > 0) {
            log.warn(`Resolving search short! ${tracksFound} of ${maxTracks} found.`, error?.message, true);
            return tracksFound;
        } else {
            throw error;
        }
    }
}

const trackCache = new Map();
async function getTrack(query, maxTracks=DEFAULT_MAX_TRACKS) {
    const cachedEntry = getCache(trackCache, query);
    if (cachedEntry) {
        return cachedEntry;
    }
    try {
        const promises = getRawSearchPromises(query, maxTracks);
        for (let promise of promises) {
            const response = await promise;
            if (Array.isArray(response?.tracks?.items)) {
                const track = response.tracks.items.find(x => {
                    return x.name.length > 0 && strip(x.name.toUpperCase().trim()) === strip(query.toUpperCase().trim())
                });
                if (track) {
                    const t = new Track(track);
                    setCache(trackCache, query, t);
                    return t;
                }
            } else break;
        }
    } catch (error) {
        log.error(`Error searching for track (num=${maxTracks}):`, query, error.message, true);
        throw error;
    }
}

async function getFirstTrack(word, exclusions=[], maxTracks=DEFAULT_MAX_TRACKS) {
    if (typeof word !== 'string' || word.length === 0) {
        return;
    }
    word = strip(word);
    try {
        const promises = getRawSearchPromises(word, maxTracks);
        for (let promise of promises) {
            const response = await promise;
            const track = (response?.tracks?.items || []).find(x => {
                return x.name.includes(' ') && strip(x.name.toUpperCase()).split(' ').includes(strip(word).toUpperCase())
                    && !exclusions.includes(strip(x.name).toLowerCase());
            });
            if (track) {
                return new Track(track);
            }
        }
    } catch (error) {
        log.error('Error searching for first track:', error.message, error, true);
        throw error;
    }
}

const artistTrackCache = new Map();
async function getTrackByArtist(fullTrackName, maxTracks=DEFAULT_MAX_TRACKS) {
    const separator = '-';
    if (typeof fullTrackName !== 'string' || !fullTrackName.includes(separator)) {
        return;
    }
    const cachedEntry = getCache(artistTrackCache, fullTrackName);
    if (cachedEntry) {
        return cachedEntry;
    }

    const song = fullTrackName.slice(0, fullTrackName.lastIndexOf(separator)).trim();
    const artist = fullTrackName.slice(fullTrackName.lastIndexOf(separator) + 1).trim();
    if (song.length < 1 || artist.length < 1) {
        return;
    }
    let potentialArtists = [];
    if (artist.includes(',') || artist.includes('&')) {
        potentialArtists = artist.trim().split(' ').filter(x => x.length > 0).join(' ');
        potentialArtists = potentialArtists.split(',').filter(x => x.length > 0).join('&');
        potentialArtists = potentialArtists.split('&').filter(x => x.length > 0).map(x => x.trim().toUpperCase());
        if (potentialArtists.length > 10) {
            potentialArtists = [];
        }
    }
    try {
        const promises = getRawSearchPromises(fullTrackName, maxTracks);
        for (let promise of promises) {
            const response = await promise;
            if (Array.isArray(response?.tracks?.items)) {
                const track = response.tracks.items.find(x => {
                    if (strip(x.name.toUpperCase().trim()) !== strip(song.toUpperCase())) return false;
                    if (strip(x.artists?.[0]?.name.toUpperCase().trim()) === strip(artist.toUpperCase())) return true;
                    if (potentialArtists.length === 0) return false;
                    const allMatch = potentialArtists.every((item) => {
                        const target = strip(item.trim().toUpperCase());
                        return x.artists?.some(y => strip(y?.name?.toUpperCase().trim()) === target);
                    });
                    return allMatch;
                });
                if (track) {
                    const t = new Track(track);
                    setCache(artistTrackCache, fullTrackName, t);
                    return t;
                }
            }
        }
    } catch (error) {
        log.error(`Error searching for track by artist (num=${maxTracks}):`,
            fullTrackName, error.message, true);
        throw error;
    }
}

async function getRandomTrack(pageRange=DEFAULT_RANDOM_PAGE_RANGE) {
    let track = null;
    const HARD_CHECK_LIMIT = 200;
    async function get() {
        const pageOffset = randomNumber(0, pageRange);
        let searchTerm = randomArrayItem(RANDOM_TRACK_TERMS);
        try {
            let response = await searchTracksRaw(searchTerm, pageOffset);
            let item = randomArrayItem(response.tracks.items);
            searchTerm = randomArrayItem(strip(item.name.trim()).split(' '));
            response = await searchTracksRaw(searchTerm);
            item = randomArrayItem(response.tracks.items);
            return (item.name? new Track(item) : null);
        } catch {
            return null;
        }
    }
    let count = 0
    while (!track || !track.name || !track.artist || track.name.slice(-1).match(/[a-z]/i) === null || isDirty(track.name)) {
        try {
            track = await get();
        } catch (error) {
            track = null;
        }
        if (++count > HARD_CHECK_LIMIT && !track?.artist) {
            let response;
            try {
                response = await searchTracksRaw(RANDOM_TRACK_TERMS[0]);
                return new Track(response.tracks.items[0]);
            } catch (error) {
                log.error('Critical error on backup search for getting random track:', response,
                    error.message, true);
                return {};
            }
        }
    }
    return track;
}

module.exports = {
    Track,
    pingMillis,
    getFirstTrack,
    getTrack,
    getTrackByArtist,
    getRandomTrack,
    searchTracks,
};
