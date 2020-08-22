import Discord, { Message } from 'discord.js';
import mongoose from 'mongoose';

import { DISCORD_TOKEN, MONGODB_PATH } from './config/secrets';
import CommandHandler from './commandHandler';
import config from './config/botConfig';
import { InteractiveMessageHandler } from './messages/interactiveMessage';

// Create a new client for the bot to use
export const client = new Discord.Client();

// Create a new commandhandler instance to parse incoming commands
const commandHandler = new CommandHandler(config.prefix);

// Flags for the bot's current initialization state
let discordLoaded = false;
let databaseLoaded = false;
let readyForInput = false;

// Called whenever the bot completes a stage of initialization
function complete() {
    // If all steps of initialization are complete
    if (discordLoaded && databaseLoaded) {
        // Allow the bot to receive input
        readyForInput = true;
        console.log('Ready for input');
    }
}

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

// When the bot observes a user adding a reaction to a message
client.on('messageReactionAdd', (messageReaction, user) => {
    // Handle the user's reaction
    InteractiveMessageHandler.handleReaction(messageReaction, user);
});

// When the bot observes a user removing a reaction from a message
client.on('messageReactionRemove', (messageReaction, user) => {
    // Handle the user's reaction
    InteractiveMessageHandler.handleReaction(messageReaction, user);
});

// When the bot encounters an error
client.on('error', error => console.error('Discord client error: ', error));

// Log the bot into the discord client with the provided token
client.login(DISCORD_TOKEN);

// Connect to the MongoDB database
mongoose.connect(MONGODB_PATH, { dbName: 'zoobot', useNewUrlParser: true, useUnifiedTopology: true }).then(
    // When a connection is established
    () => {
        console.log('MongoDB connected');
        // Indicate that the bot has logged into the database
        databaseLoaded = true;
        complete();
    },
    // If there was an error connecting
    error => console.error('MongoDB connection error: ', error)
);