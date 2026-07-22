/**
 * Get time to ping the bot.
 * 
 * Author: Adam Seidman
 */

const Discord = require('discord.js');
const config = require('../../client/config');
const { hideOption, getHideResult } = require('../helpers');
const spotify = require('../spotify');

module.exports = {
    phrase: 'ping',
    data: new Discord.SlashCommandBuilder()
        .setName('ping')
        .setDescription('Get current bot latency.')
        .addStringOption(hideOption),
    execute: async (interaction) => {
        let time = Date.now() - interaction.createdTimestamp;
        let spotifyPing = await spotify.pingMillis();
        if (spotifyPing < 0) {
            spotifyPing = 'ERROR';
        } else if (spotifyPing < 1) {
            spotifyPing = '<1';
        }
        if ( time < 1 ) {
            time = '<1';
        }
        let embed = new Discord.EmbedBuilder()
            .setColor(config.options.embedColor)
            .setTitle('Ping Time')
            .setDescription(`Discord Latency: ${time} ms.\nSpotify Latency: ${Math.ceil(spotifyPing)} ms.`)
            .setTimestamp();
        interaction.reply({ embeds: [embed], ephemeral: getHideResult(interaction) });
    },
    immediate: true
};
