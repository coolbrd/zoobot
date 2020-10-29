import { Document, Types } from "mongoose";
import { Species, SpeciesModel } from "../models/Species";
import GameObjectCache from "../structures/GameObjectCache";

// The manager instance for all species and their information
export default class SpeciesManager extends GameObjectCache<Species> {
    protected readonly model = SpeciesModel;

    protected readonly cacheTimeout = 600000;

    protected documentToGameObject(document: Document): Species {
        return new Species(document);
    }

    // Gets a species object by its id
    public async fetchExistingById(id: Types.ObjectId): Promise<Species> {
        // Try to find an already cached species by its id
        const cachedSpecies = this.getCachedGameObject(id);

        // If that species is already in the cache
        if (cachedSpecies) {
            // Reset the cached species' deletion timer
            cachedSpecies.resetTimer();

            // Return the existing species from the cache
            return cachedSpecies.gameObject;
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

        // If no species of the given id exists
        if (!speciesDocument) {
            throw new Error("A species id whose document couldn't be found was attempted to be fetched from the species cache.");
        }

        // Turn the document into an object and add it to the cache
        const species = new Species(speciesDocument);

        // Add the found species to the cache
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
        // Case-insensitive search
        name = name.toLowerCase();

        // Check the cache first
        for (const cachedSpecies of this.cache.values()) {
            // If the current species has the searched common name
            if (cachedSpecies.gameObject.commonNames.includes(name)) {
                // Reset its cache reset timer
                cachedSpecies.resetTimer();

                // Return the cached value
                return cachedSpecies.gameObject;
            }
        }

        // Search for the species in the database
        let speciesDocument: Document | null;
        try {
            speciesDocument = await SpeciesModel.findOne({ [Species.fieldNames.commonNamesLower]: name });
        }
        catch (error) {
            throw new Error(`There was an error finding a species by its common name: ${error}`);
        }

        // If no species with the searched common name exists, return nothing
        if (!speciesDocument) {
            return;
        }

        // Convert the document into an object and add it to the cache
        const species = this.documentToGameObject(speciesDocument);
        
        // Add the found species to the cache
        try {
            await this.addToCache(species);
        }
        catch (error) {
            throw new Error(`There was an error adding a species to the cache: ${error}`);
        }

        return species;
    }
}