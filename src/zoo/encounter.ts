import { Guild, TextChannel } from "discord.js";

import Species from "../models/species";

export async function guildAnimalChance(guild: Guild) {
    // Generate a random real number to use in determining animal spawning
    const chance = Math.random();
    // 100% of all messages
    if (chance <= 1) {
        // Spawn an animal encounter
        await spawnAnimal(guild);
    }
}

// Spawn an animal encounter in a given server
async function spawnAnimal(guild: Guild) {
    console.log(`Attempting to spawn an animal in ${guild.name}`);
    // Get the first text channel in the server
    const channel = guild.channels.cache.find(channel => channel.type === "text") as TextChannel;
    
    // Get a random species from all animals
    const species = (await Species.aggregate().sample(1).exec())[0];

    // Send the encounter
    channel.send(`Look, It's ${species["scientificName"]}!`);
    console.log(species["_id"]);
}