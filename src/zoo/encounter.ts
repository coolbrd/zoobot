import { TextChannel, GuildResolvable } from 'discord.js';

import SpeciesModel, { SpeciesDocument } from '../models/species';
import { client } from '..';
import EncounterMessage from '../messages/encountermessage';

// Performs a chance to spawn an animal encounter in a guild
export async function guildAnimalChance(guild: GuildResolvable): Promise<void> {
    // Generate a random real number to use in determining animal spawning
    const chance = Math.random();
    // 10% of all messages (for testing purposes)
    if (chance <= 0.1) {
        try {
            // Spawn an animal encounter
            await spawnAnimal(guild);
        }
        catch (error) {
            console.error('Error trying to spawn an animal in a guild.', error);
        }
    }
}

// Spawn an animal encounter in a given server
async function spawnAnimal(guildResolvable: GuildResolvable) {
    const guild = client.guilds.resolve(guildResolvable);
    if (!guild) {
        throw new Error('Attempted to spawn an animal in a guild that could not be resolved.');
    }

    let channel: TextChannel;
    try {
        // Get the first text channel in the server
        channel = guild.channels.cache.find(channel => channel.type === 'text') as TextChannel;
        if (!channel) {
            throw new Error('No valid text channel was found when attempting to retrieve the first one.');
        }
    }
    catch (error) {
        console.error('Error trying to find the first text channel of a guild for encounter spawning.', error);
        return;
    }
    
    let species: SpeciesDocument;
    try {
        // Get a random species from all animals and convert it to a proper species instance
        species = (await SpeciesModel.aggregate().sample(1).exec())[0];
        if (!species) {
            throw new Error('No document was returned when trying to select a random animal.');
        }
    }
    catch (error) {
        console.error('Error trying to select a random species for a new encounter message.', error);
        return;
    }

    try {
        // Send an encounter message to the channel
        const encounterMessage = new EncounterMessage(channel, species);
        await encounterMessage.send();
    }
    catch (error) {
        console.error('Error initializing a new encounter message.', error);
        return;
    }
}