/**
 * Handle user interactions one by one.
 * 
 * Author: Adam Seidman
 */

var requestMap = {}

var enqueueRequest = function(guildId, fnToCall, ...args) {
    if (guildId === undefined) return
    if (requestMap[`#${guildId}`] === undefined) {
        requestMap[`#${guildId}`] = {
            requests: [],
            requestRunning: false
        }
    }
    return new Promise((resolve, reject) => {
        requestMap[`#${guildId}`].requests.push({
            resolve,
            reject,
            fnToCall,
            args
        })
        tryNext(guildId)
    })
}

var tryNext = function(guildId) {
    if (guildId === undefined) return
    let guildRequests = requestMap[`#${guildId}`]
    if (guildRequests === undefined || guildRequests.requests.length < 1) {
        return
    }
    else if (!guildRequests.requestRunning) {
        guildRequests.requestRunning = true
        let { resolve, reject, fnToCall, args } = guildRequests.requests.shift()
        let req = fnToCall(...args)
        if ( req === undefined || req.then === undefined ) {
            resolve(req)
            guildRequests.requestRunning = false
            tryNext(guildId)
        } else {
            req.then(res => resolve(res))
                .catch(err => reject(err))
                .finally(() => {
                    guildRequests.requestRunning = false
                    tryNext(guildId)
                })
        }
    }
}

const peekLength = guildId => {
    if (requestMap[`#${guildId}`] === undefined) return 0
    let len = requestMap[`#${guildId}`].requests.length
    if (requestMap[`#${guildId}`].requestRunning) {
        len++
    }
    return len
}

module.exports = {
    enqueueRequest,
    peekLength
}
