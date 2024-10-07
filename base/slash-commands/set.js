/**
 * Set server-related items.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const games = require('../game')
const Discord = require('discord.js')
const { isAdmin } = require('../helpers')
const log = require('better-node-file-logger')

const setChannel = async interaction => {
    let channel = interaction.options.getChannel('channel')
    let sendResponse = await games.changeChannel(interaction, channel)
    if (sendResponse !== undefined) {
        interaction.reply({content: `Chain channel set to <#${channel.id}>.`, ephemeral: sendResponse})
        log.info(`New chain channel set in '${interaction.guild.name}'`, interaction.channel.name)
    }
}

const setPrefix = async interaction => {
    let prefix = interaction.options.getString('prefix')
    await db.setServerPrefix(interaction.guild.id, prefix)
    interaction.reply(`Server prefix set to \`${prefix}\`.`)
    log.info('Server set new prefix to: ' + prefix, interaction.guild.name)
}

const setSingleWords = async interaction => {
    let allowed = interaction.options.getBoolean('allowed')
    await db.setSingleWordsAllowed(interaction.guild.id, allowed)
    interaction.reply(`Single word songs now set to \`${allowed? 'enabled' : 'disabled'}\`.`)
}

const setChallenges = async interaction => {
    let allowed = interaction.options.getBoolean('allowed')
    await db.setChallengesAllowed(interaction.guild.id, allowed)
    interaction.reply(`Song challenges now set to \`${allowed? 'enabled' : 'disabled'}\`.`)
}

const setShuffle = async interaction => {
    let allowed = interaction.options.getBoolean('allowed')
    await db.setShuffleAllowed(interaction.guild.id, allowed)
    interaction.reply(`Shuffle command now set to \`${allowed? 'enabled' : 'disabled'}\`.`)
}

const setChallengeFirst = async interaction => {
    let allowed = interaction.options.getBoolean('allowed')
    await db.setChallengeFirstAllowed(interaction.guild.id, allowed)
    interaction.reply(`Challenging first song now set to \`${allowed? 'enabled' : 'disabled'}\`.`)
}

const setRequireArtist = async interaction => {
    let required = interaction.options.getBoolean('required')
    await db.setArtistsRequired(interaction.guild.id, required)
    interaction.reply(`Setting artist requirement to \`${required? '' : 'not '}required\`.`)
}

const subCommands = {
    channel: setChannel,
    prefix: setPrefix,
    'single-words-allowed': setSingleWords,
    'challenges-allowed': setChallenges,
    'shuffle-allowed': setShuffle,
    'challenge-first': setChallengeFirst,
    'artist-required': setRequireArtist
}

module.exports = {
    phrase: 'set',
    data: new Discord.SlashCommandBuilder()
        .setName('set')
        .setDescription('Set server rules.')
        .addSubcommand(subcommand => 
            subcommand
                .setName('channel')
                .setDescription('Set channel for the game to run in.')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('Channel for the game.')
                        .setRequired(true)
                        .addChannelTypes(Discord.ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('prefix')
                .setDescription('Set prefix to choose song.')
                .addStringOption(option => 
                    option.setName('prefix')
                        .setDescription('New guessing prefix.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('single-words-allowed')
                .setDescription('Set whether or not single words are allowed as song titles.')
                .addBooleanOption(option => 
                    option.setName('allowed')
                        .setDescription('Are single words allowed?')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('challenges-allowed')
                .setDescription('Set whether or not users can challenge recent song titles.')
                .addBooleanOption(option =>
                    option.setName('allowed')
                        .setDescription('Are challenges allowed?')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('shuffle-allowed')
                .setDescription('Set whether or not first song of chain can be shuffled.')
                .addBooleanOption(option =>
                    option.setName('allowed')
                        .setDescription('Is shuffle allowed?')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('challenge-first')
                .setDescription('Set whether or not challenging the first song of a chain is allowed.')
                .addBooleanOption(option =>
                    option.setName('allowed')
                        .setDescription('Can the first song be challenged?')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('artist-required')
                .setDescription('Set whether or not the artist is requried within a guess.')
                .addBooleanOption(option =>
                    option.setName('required')
                        .setDescription('Require artist names?')
                        .setRequired(true)
                )
        ),
    execute: interaction => {
        if (!isAdmin(interaction)) {
            interaction.reply({ content: 'Set commands are restricted to administrators.', ephemeral: true })
            return
        }
        let sub = interaction.options.getSubcommand()
        if ( typeof sub !== 'string' || subCommands[sub] === undefined ) {
            interaction.reply({ content: 'Could not find set sub-command!', ephemeral: true })
        }
        else {
            subCommands[sub](interaction)
        }
    },
    immediate: true
}
