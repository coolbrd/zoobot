import Discord, { Message } from 'discord.js';
import mongoose from 'mongoose';

import { DISCORD_TOKEN, MONGODB_PATH } from './config/secrets';
import { errorHandler } from './structures/errorHandler';
import { interactiveMessageHandler } from './interactiveMessage/interactiveMessageHandler';
import { encounterHandler } from './zoo/encounterHandler';
import { commandHandler } from './structures/commandHandler';

// Create a new client for the bot to use
export const client = new Discord.Client();

// Flags for the bot's current initialization state
let discordLoaded = false;
let databaseLoaded = false;
let rarityTableLoaded = false;
let guildPrefixesLoaded = false;
let handlersInitialized = false;
let readyForInput = false;

// Called whenever the bot completes a stage of initialization
function complete() {
    // If all steps of initialization are complete
    if (discordLoaded && databaseLoaded && rarityTableLoaded && guildPrefixesLoaded && handlersInitialized) {
        // Allow the bot to receive input
        readyForInput = true;
        console.log('Ready for input');
    }
}

// Connect to the MongoDB database
mongoose.connect(MONGODB_PATH, { dbName: 'zoobot', useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('MongoDB connected');
    // Indicate that the bot has logged into the database
    databaseLoaded = true;
    complete();

    // Load all custom guild prefixes
    commandHandler.loadGuildPrefixes().then(() => {
        console.log('Guild prefixes loaded');

        guildPrefixesLoaded = true;
        complete();
    });

    // Now try to load the species rarity table
    encounterHandler.loadRarityTable().then(() => {
        console.log('Rarity table loaded');
    
        rarityTableLoaded = true;
        complete();
    })
}).catch(error => {
    // If there was an error connecting
    console.error('MongoDB connection error: ', error)
});

// When the bot is ready to receive input
client.on('ready', () => {
    console.log('Logged into Discord');

    // Indicate that the bot has logged into Discord
    discordLoaded = true;
    complete();

    // Initialize all centralized handlers
    errorHandler.init(client).then(() => {
        interactiveMessageHandler.init(client);

        console.log('Handlers initialized');

        handlersInitialized = true;
        complete();
    }).catch(error => {
        throw new Error('There was an error intiailizing the error handler (uh oh!): ' + error);
    });
});

// When the bot receives a message
client.on('message', (message: Message) => {
    // If the bot is not yet ready to receive input
    if (!readyForInput) {
        // Don't do anything with the message
        return;
    }

    // Handle the incoming message
    commandHandler.handleMessage(message);
});

// When the bot encounters an error
client.on('error', error => console.error('Discord client error: ', error));

// Log the bot into the discord client with the provided token
client.login(DISCORD_TOKEN);