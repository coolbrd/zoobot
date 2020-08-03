import { Guild, TextChannel } from "discord.js";

import Species from "../models/species";

export async function guildAnimalChance(guild: Guild) {
    // Generate a random real number to use in determining animal spawning
    const chance = Math.random();
    console.log(chance);
    // 100% of all messages
    if (chance <= 1) {
      // Spawn an animal encounter
      spawnAnimal(guild);
    }
}


function spawnAnimal(guild: Guild) {
    console.log(`Attempting to spawn an animal in ${guild.name}`);
    const channel = guild.channels.cache.find(channel => channel.type === "text") as TextChannel;
    
    // Generate an encounter and send it

    channel.send("An animal appeared!");
}