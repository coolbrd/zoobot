import { TextChannel } from 'discord.js';

import { Species, SpeciesObject } from '../models/species';
import EncounterMessage from '../messages/encountermessage';
import { Schema } from 'mongoose';
import { interactiveMessageHandler } from '..';
import { getWeightedRandom } from '../utility/toolbox';

// A handler class that deals with creating encounters with species from the total set
export default class EncounterHandler {
    // The map of id and rarity pairs that will determine how common each species is
    private rarityMap: Map<Schema.Types.ObjectId, number> = new Map();

    // Loads/reloads the rarity table from the database
    public async loadRarityTable(): Promise<void> {
        // Get all species and their associated rarity values
        const rarityList = await Species.find({}, { rarity: 1 }).exec();

        // Reset the rarity map (useful for reloading the values after already being initialized)
        this.rarityMap = new Map();

        // Add each species to the map
        rarityList.forEach(species => {
            this.rarityMap.set(species._id, species.get('rarity'));
        });
    }

    // Spawn an animal encounter in a given server
    public async spawnAnimal(channel: TextChannel): Promise<void> {
        // Don't try to spawn anything if the rarity map is empty
        if (this.rarityMap.size < 1) {
            throw new Error('Tried to spawn an animal before the encounter rarity map was formed.');
        }

        // Get a weighted random species from the rarity map, and convert it to a species document
        const speciesDocument = await Species.findById(getWeightedRandom(this.rarityMap));

        // If somehow no species by that id was found
        if (!speciesDocument) {
            throw new Error('No species was found by a given id from the encounter rarity table.');
        }

        try {
            // Send an encounter message to the channel
            const encounterMessage = new EncounterMessage(interactiveMessageHandler, channel, new SpeciesObject(speciesDocument));
            await encounterMessage.send();
        }
        catch (error) {
            console.error('Error initializing a new encounter message.', error);
            return;
        }
    }
}