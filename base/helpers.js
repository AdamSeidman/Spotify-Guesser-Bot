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
        return utils.stripPunctuation(str).replaceAll('\'','')
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
    getHideResult: interaction => (interaction.options.getString('hide') === 'yes')
}
