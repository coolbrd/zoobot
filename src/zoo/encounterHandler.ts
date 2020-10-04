import { TextChannel } from 'discord.js';
import { Document, Schema } from 'mongoose';

import { Species, SpeciesObject } from '../models/species';
import EncounterMessage from '../messages/encountermessage';
import { interactiveMessageHandler } from '..';
import getWeightedRandom from "../utility/getWeightedRandom";
import { errorHandler } from '../structures/errorHandler';

// A handler class that deals with creating encounters with species from the total set
export default class EncounterHandler {
    // The map of ID and rarity pairs that will determine how common each species is
    private rarityMap: Map<Schema.Types.ObjectId, number> = new Map();

    // Loads/reloads the rarity table from the database
    public async loadRarityTable(): Promise<void> {
        let rarityList: Document[];
        // Get all species and their associated rarity values
        try {
            rarityList = await Species.find({}, { rarity: 1 });
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error getting all species rarities from the database.');
            return;
        }

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

        let speciesDocument: Document | null;
        // Get a weighted random species from the rarity map, and convert it to a species document
        try {
            speciesDocument = await Species.findById(getWeightedRandom(this.rarityMap));
        }
        catch (error) {
            throw new Error('There was an error getting a species by an id.');
        }

        // If somehow no species by that ID was found
        if (!speciesDocument) {
            throw new Error('No species was found by a given ID from the encounter rarity table.');
        }

        const encounterMessage = new EncounterMessage(interactiveMessageHandler, channel, new SpeciesObject({document: speciesDocument}));
        // Send an encounter message to the channel
        try {
            await encounterMessage.send();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error sending a new encounter message.');
            return;
        }
    }
}