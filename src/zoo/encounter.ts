import { Guild, TextChannel, Message } from "discord.js";

import Species from "../models/species";
import { Document } from "mongoose";
import InteractiveMessage from "../utility/interactiveMessage";

export async function guildAnimalChance(guild: Guild) {
    // Generate a random real number to use in determining animal spawning
    const chance = Math.random();
    // 50% of all messages
    if (chance <= 0.5) {
        // Spawn an animal encounter
        return await spawnAnimal(guild);
    }
}

// Spawn an animal encounter in a given server
async function spawnAnimal(guild: Guild) {
    // Get the first text channel in the server
    const channel = guild.channels.cache.find(channel => channel.type === "text") as TextChannel;
    
    // Get a random species from all animals
    const species = (await Species.aggregate().sample(1).exec())[0] as Document;

    // Create the map that will be used for message interactions
    const messageInteractions = new Map<string, Function>();

    messageInteractions.set("👽", () => {
        console.log("ALIENS!");
    });
    messageInteractions.set("🐕", () => {
        console.log("Just dogs.");
    });

    const encounterMessage = new InteractiveMessage(messageInteractions);
    await encounterMessage.send(channel);

    return encounterMessage;
}