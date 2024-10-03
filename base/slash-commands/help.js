/**
 * Help information embed.
 * 
 * Author: Adam Seidman
 */

const Discord = require('discord.js')
const config = require('../../client/config')
const log = require('better-node-file-logger')
const { hideOption, getHideResult } = require('../helpers')

var commandCategoryMenu = undefined
var mainCategoryMenu = undefined

const mainItems = [
    {
        name: 'Setup',
        description: 'Bot setup instructions',
        title: 'Setup Instructions',
        info: `1. Find a channel that you want to use the bot in. Use \`/set channel\` to start a game in that channel.
2. Use the \`/set\` commands listed in the Commands section to set the game rules as you like.
3. Use \`/info rules\` to confirm the rules for the server's chains.
4. Have fun!`
    }, {
        name: 'Rules',
        description: 'Rules of the game',
        title: 'Rules',
        info: `1. The next song in a chain must include the last word of the previous song.
2. You may not go twice in a row.
3. Songs cannot be repeated within ${config.options.minRepeatGuesses} guesses.
4. All song guesses must exist within the first ${config.options.maxSearchPages * 20} search results on Spotify.
5. Songs must have the designated prefix at the beginning of the message for the bot to count them. Your prefix may be checked with \`/info rules\`.`
    }, {
        name: 'Formatting',
        description: 'Formatting of guesses',
        title: 'Guess Formatting',
        info: `To guess a song, use a prefix, followed by the song name.
            Unless required in your server rules, adding an artist to your guess is not mandatory.
            To specify an artist, use a dash between the song title and the artist(s).
            You may list more artists, but they all must match for the guess to count.
            To list multiple artists, separate them by commas or ampersands.
            You will not be penalized for incorrect punctuation or symbol characters.
            Each of the following examples will use a prefix of \`!\`. Substitute the prefix for the one used in your server.
            All of the following are valid guesses of the same song:
            > !Star Wars (Main Theme)
            > !star wars main theme
            > !Star Wars main theme - John Williams
            > !"Star Wars Main Theme" - john williams, london symphony orchestra
            > !star wars main theme-London Symphony Orchestra & John Williams`
    }, {
        name: 'Commands',
        description: 'Available commands',
        title: 'Bot Commands',
        info: `\`/about ([hide])\`: Displays bot information.
\`/challenge\`: Challenge a song title if you believe there are no songs that start with it's last word. Will break the chain if incorrect.
    Only available on some servers.
\`/details ([track][hide])\`: Get details of a recent song. Specify an option to get from the chain. Default is most recent song.
\`/history best ([hide])\`: Show the chain from the best round in this server.
\`/history current ([hide])\`: Show the running chain in it's current state.
\`/history last ([hide])\`: Show the last complete chain from this server.
\`/history round [number]([hide])\`: Show the chain from a specified round number.
\`/info next-word ([hide])\`: Show the next word in the running chain.
\`/info round-number ([hide])\`: Get the current round number.
\`/info rules ([hide])\`: Get this server's chain rules.
\`/leaderboard global-users ([hide])\`: Show the global leaderboard for all user scores.
\`/leaderboard global-servers ([hide])\`: Show the global leaderboard for longest server chains.
\`/leaderboard server ([hide])\`: Show the leaderboard for users within this server, by points.
\`/playlist [round]\`: Create a playlist of one of your favorite rounds. Requires at least ${config.options.minPlaylistTracks} contributions.
The playlist title will include the name of your server and the cover art will be your server picture.
\`/set artist-required [required]\`: Set whether or not artist is required in guess. Command only available to admins.
\`/set challenge-first [allowed]\`: Set whether or not you can challenge the first provided song in a chain. Command only available to admins.
\`/set challenges-allowed [allowed]\`: Set whether or not challenges are allowed on this server. Can soft-lock without this enabled. Command only available to admins.
\`/set channel [channel]\`: Set channel to play the game in. The first time this command is run will start the game. Command only available to admins.
\`/set prefix [prefix]\`: Set the prefix to use to make guesses. Default is \`!\`. Command only available to admins.
\`/set shuffle-allowed [allowed]\`: Set whether or not the shuffle command is permitted. Command only available to admins.
\`/set single-words-allowed [allowed]\`: Set whether or not songs which contain a single word in the title are permitted. Command only available to admins.
\`/shuffle\`: Shuffles the first song in a chain. Must be enabled on the server.
\`/song-info [track]([hide])\`: Get details of a specific song from Spotify.
\`/stats server ([hide])\`: Get server statistics.
\`/stats user [user]([hide])\`: Get statistics about a user. Leaving the user blank gets your own statistics.`
    }
]

const setupDropdowns = () => {
    if (commandCategoryMenu !== undefined && mainCategoryMenu !== undefined) return
    let fields = []

    mainItems.forEach(x => {
        fields.push(
            new Discord.StringSelectMenuOptionBuilder()
                .setLabel(x.name)
                .setDescription(x.description)
                .setValue(x.name)
        )
    })
    mainCategoryMenu = new Discord.StringSelectMenuBuilder()
        .setCustomId('help_main')
        .setPlaceholder('Pick a category')
        .addOptions(...fields)
}

const showHelp = async interaction => {
    setupDropdowns()
    interaction.reply({
        components: [new Discord.ActionRowBuilder().addComponents(mainCategoryMenu)],
        ephemeral: getHideResult(interaction)
    })
}

const handleMainChange = interaction => {
    let helpItem = mainItems.find(x => x.name === interaction.values[0])
    let embed = new Discord.EmbedBuilder()
        .setColor(config.options.embedColor)
        .setTitle(helpItem.title)
        .setDescription(helpItem.info)
    interaction.update({ embeds: [embed] })
}

const subcommands = {
    main: handleMainChange
}

const handleDropdownUpdate = (interaction, parts) => {
    let sub = subcommands[parts[0]]
    if (sub === undefined) {
        interaction.reply({content: 'Could not complete request!', ephemeral: true})
        log.error('Could not complete help subcommand change')
    }
    else {
        sub(interaction)
    }
}

module.exports = {
    phrase: 'help',
    data: new Discord.SlashCommandBuilder()
        .setName('help')
        .setDescription('See information about each available command.')
        .addStringOption(hideOption),
    execute: showHelp,
    immediate: true,
    dropdownHook: handleDropdownUpdate
}
