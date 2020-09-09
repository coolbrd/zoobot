import { TextChannel } from 'discord.js';

import { Species } from '../models/species';
import EncounterMessage from '../messages/encountermessage';
import { Document } from 'mongoose';

// Spawn an animal encounter in a given server
export async function spawnAnimal(channel: TextChannel): Promise<void> {
    
    let species: Document | null;
    try {
        const randomDoc = (await Species.aggregate().sample(1).exec())[0];

        // Get a random species from all animals and convert it to a proper species instance
        species = await Species.findOne({ _id: randomDoc._id });
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