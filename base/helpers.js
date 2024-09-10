/**
 * Assorted helper functions.
 * 
 * Author: Adam Seidman
 */
const utils = require('poop-sock')

module.exports = {
    strip: str => {
        if (typeof str !== 'string') return ''
        return utils.stripPunctuation(str).replaceAll('\'','')
    },
    randomArrayItem: utils.randomArrayItem
}