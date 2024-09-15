/**
 * Set server-related items.
 * 
 * Author: Adam Seidman
 */

const db = require('../db')
const games = require('../game')
const Discord = require('discord.js')
const { isAdmin } = require('../helpers')

const setChannel = async interaction => {
    let channel = interaction.options.getChannel('channel')
    let sendResponse = await games.changeChannel(interaction, channel)
    if (sendResponse !== undefined) {
        interaction.reply({content: `Chain channel set to <#${channel.id}>.`, ephemeral: sendResponse})
    }
}

const setPrefix = async interaction => {
    let prefix = interaction.options.getString('prefix')
    await db.setServerPrefix(interaction.guild.id, prefix)
    interaction.reply(`Server prefix set to \`${prefix}\`.`)
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

const subCommands = {
    channel: setChannel,
    prefix: setPrefix,
    'single-words-allowed': setSingleWords,
    'challenges-allowed': setChallenges
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
        subCommands[sub](interaction)
    }
}
