import Discord, { Message } from 'discord.js';
import mongoose from 'mongoose';

import { DISCORD_TOKEN, MONGODB_PATH } from './config/secrets';
import config from './config/botConfig';
import CommandHandler from './commandHandler';
import EncounterHandler from './zoo/encounterHandler';
import InteractiveMessageHandler from './interactiveMessage/interactiveMessageHandler';

// Create a new client for the bot to use
export const client = new Discord.Client();

// Create the handler object for all interactive messages
export const interactiveMessageHandler = new InteractiveMessageHandler(client);

// Create the handler object for all animal encounters
export const encounterHandler = new EncounterHandler();

// Create a new commandhandler instance to parse incoming commands
const commandHandler = new CommandHandler(config.prefix);

// Flags for the bot's current initialization state
let discordLoaded = false;
let databaseLoaded = false;
let rarityTableLoaded = false;
let readyForInput = false;

// Called whenever the bot completes a stage of initialization
function complete() {
    // If all steps of initialization are complete
    if (discordLoaded && databaseLoaded && rarityTableLoaded) {
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