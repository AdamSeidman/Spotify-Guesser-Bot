/**
 * Assorted helper functions.
 * 
 * Author: Adam Seidman
 */
const utils = require('poop-sock')
const wait = require('node:timers/promises').setTimeout

module.exports = {
    strip: str => {
        if (typeof str !== 'string') return ''
        return utils.stripPunctuation(str).replaceAll('\'','')
    },
    randomArrayItem: utils.randomArrayItem,
    wait,
    getPercentage: (num, denom) => {
        num /= denom
        return `${Math.round((num + Number.EPSILON) * 10000) / 100}%`
    }
}
