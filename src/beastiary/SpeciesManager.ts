import { Document, Types } from "mongoose";

import { Species, SpeciesModel } from "../models/Species";
import WrapperCache from "../structures/GameObjectCache";

export default class SpeciesManager extends WrapperCache<Species> {
    constructor() {
        super(3000);
    }

    // Gets a species object by its id
    public async fetchById(id: Types.ObjectId): Promise<Species> {
        // Try to find an already cached species by its id
        const cachedSpecies = this.getCachedValue(id);

        // If that species is already in the cache
        if (cachedSpecies) {
            // Reset the cached species' deletion timer
            cachedSpecies.setTimer(this.createNewTimer(cachedSpecies.value));

            // Return the existing species from the cache
            return cachedSpecies.value;
        }
        // The species wasn't found in the cache

        // Find the species in the database
        let speciesDocument: Document | null;
        try {
            speciesDocument = await SpeciesModel.findById(id);
        }
        catch (error) {
            throw new Error(`There was an error finding an existing species document: ${error}`);
        }

        if (!speciesDocument) {
            throw new Error("A species id whose document couldn't be found was attempted to be fetched from the species cache.");
        }

        // Turn the document into an object and add it to the cache
        const species = new Species(speciesDocument);

        try {
            await this.addToCache(species);
        }
        catch (error) {
            throw new Error(`There was an error adding a species to the cache: ${error}`);
        }

        // Return the species
        return species;
    }

    // Searches and returns a species object by a common name
    public async fetchByCommonName(name: string): Promise<Species | undefined> {
        name = name.toLowerCase();

        // Check the cache first
        for (const cachedSpecies of this.cache.values()) {
            if (cachedSpecies.value.commonNames.includes(name)) {
                cachedSpecies.setTimer(this.createNewTimer(cachedSpecies.value));

                return cachedSpecies.value;
            }
        }

        // Search for the species in the database
        let speciesDocument: Document | null;
        try {
            speciesDocument = await SpeciesModel.findOne({ commonNamesLower: name });
        }
        catch (error) {
            throw new Error(`There was an error finding a species by its common name: ${error}`);
        }

        if (!speciesDocument) {
            return;
        }

        // Convert the document into an object and add it to the cache
        const species = new Species(speciesDocument);
        
        try {
            await this.addToCache(species);
        }
        catch (error) {
            throw new Error(`There was an error adding a species to the cache: ${error}`);
        }

        return species;
    }
}