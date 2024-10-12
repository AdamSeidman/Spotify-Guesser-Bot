/**
 * Custom logging functions.
 * 
 * Author: Adam Seidman
 */

const Discord = require('discord.js')
const config = require('../client/config')
const log = require('better-node-file-logger')

const announce = str => {
    if (typeof config.discord.announcementChannelId != 'string') {
        return
    }
    let channel = require('../client/client').client.channels.cache
        .filter(x => x instanceof Discord.TextChannel)
        .find(x => x.id == config.discord.announcementChannelId)
    if ( channel !== undefined ) {
        channel.send(`Announcement: ${str}`)
    }
}

const init = () => {
    log.quickInit('SGB_')
}

const info = (str, vars, verbalize) => {
    log.info(str, vars)
    if (verbalize) announce(`${str} (${vars})`)
}

const warn = (str, vars, verbalize) => {
    log.warn(str, vars)
    if (verbalize) announce(`${str} (${vars})`)
}

const error = (str, vars, err, verbalize) => {
    if (verbalize) {
        log.error(`${str} Var: ${vars}`, err)
        announce(`${str} (${vars})`)
    }
    else {
        log.error(str, vars)
    }
}

module.exports = {
    init,
    info,
    warn,
    error
}
