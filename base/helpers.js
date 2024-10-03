/**
 * Assorted helper functions.
 * 
 * Author: Adam Seidman
 */
const utils = require('poop-sock')
const { ActionRowBuilder } = require('discord.js')
const wait = require('node:timers/promises').setTimeout

module.exports = {
    strip: str => {
        if (typeof str !== 'string') return ''
        // eslint-disable-next-line no-useless-escape
        return str.replace(/['!"#$%&\\'()\*+,\-\.\/:;<=>?@\[\\\]\^_`{|}~']/g, '')
            .replace(/\s{2,}/g, ' ')
            .replaceAll('\'', '')
            .split('"').join('')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .trim()
    },
    randomArrayItem: utils.randomArrayItem,
    wait,
    getPercentage: (num, denom) => {
        num /= denom
        return `${Math.round((num + Number.EPSILON) * 10000) / 100}%`
    },
    getActionRow: btns => {
        return [new ActionRowBuilder().addComponents(...btns.map(x => x.btn))]
    },
    hideOption: option =>
        option
            .setName('hide')
            .setDescription('Hide results from being shown publicly.')
            .addChoices({
                name: 'yes',
                value: 'yes'
            },{
                name: 'no',
                value: 'no'
            })
            .setRequired(false),
    getHideResult: interaction => (interaction.options.getString('hide') === 'yes'),
    isAdmin: msg => {
        if (msg === undefined || msg.member === undefined) return false
        let isAdmin = false
        try {
            let res = msg.member.permissionsIn(msg.channel).has('ADMINISTRATOR')
            isAdmin = res
        // eslint-disable-next-line no-empty
        } catch (err) {}
        return isAdmin
    },
    copyObject: obj => {
        if (obj === undefined || typeof obj !== 'object') return obj
        return utils.copyObject(obj)
    },
    escapeDiscordString: str => str.replace(/(\*|_|`|~|\\)/g, '\\$1')
}
