import Discord, { Message } from "discord.js";
import mongoose from "mongoose";
import { DISCORD_TOKEN, MONGODB_PATH } from "./config/secrets";
import { errorHandler } from "./structures/ErrorHandler";
import { interactiveMessageHandler } from "./interactiveMessage/InteractiveMessageHandler";
import { encounterHandler } from "./beastiary/EncounterHandler";
import { commandHandler } from "./structures/CommandHandler";
import { beastiary } from "./beastiary/Beastiary";

export const client = new Discord.Client();

const preLoad = {
    discordLoaded: false,
    databaseLoaded: false,
    rarityTableLoaded: false,
    guildPrefixesLoaded: false,
    handlersInitialized: false
}
let readyForInput = false;

function complete() {
    if (Object.values(preLoad).every(requirement => requirement)) {
        readyForInput = true;
        console.log("Ready for input");
    }
}

mongoose.connect(MONGODB_PATH, { dbName: "zoobot", useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log("MongoDB connected");
    preLoad.databaseLoaded = true;
    complete();

    commandHandler.loadGuildPrefixes().then(() => {
        console.log("Guild prefixes loaded");

        preLoad.guildPrefixesLoaded = true;
        complete();
    }).catch(error => {
        throw new Error(`There was an error loading all guild prefixes: ${error}`);
    });

    encounterHandler.loadRarityTable().then(() => {
        console.log("Rarity table loaded");
    
        preLoad.rarityTableLoaded = true;
        complete();
    }).catch(error => {
        throw new Error(`There was an error loading the species rarity table: ${error}`);
    });
}).catch(error => {
    throw new Error(`MongoDB connection error: ${error}`);
});

client.on("ready", () => {
    console.log("Logged into Discord");

    preLoad.discordLoaded = true;
    complete();

    errorHandler.init(client).then(() => {
        interactiveMessageHandler.init(client);

        beastiary.players.init().then(() => {
            console.log("Handlers initialized");

            preLoad.handlersInitialized = true;
            complete();
        }).catch(error => {
            throw new Error(`There was an error initializing the player manager: ${error}`);
        });
    }).catch(error => {
        throw new Error(`There was an error intiailizing the error handler (uh oh!): ${error}`);
    });
});

client.on("message", (message: Message) => {
    if (!readyForInput) {
        return;
    }

    commandHandler.handleMessage(message).then(() => {
        beastiary.players.handleMessage(message).catch(error => {
            throw new Error(`There was an error handling a message through the player manager: ${error}`);
        });
    }).catch(error => {
        throw new Error(`There was an error handling a message as a command: ${error}`);
    });
});

client.on("error", error => console.error("Discord client error: ", error));

client.login(DISCORD_TOKEN);

export async function exit(): Promise<void> {
    client.destroy();

    try {
        await mongoose.disconnect();
    }
    catch (error) {
        throw new Error(`There was an error disconnecting from the active MongoDB instance: ${error}`);
    }

    process.exit();
}