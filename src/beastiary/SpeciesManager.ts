import { Document } from "mongoose";
import gameConfig from "../config/gameConfig";
import { Species, SpeciesModel } from "../models/Species";
import GameObjectCache from "../structures/GameObjectCache";

export default class SpeciesManager extends GameObjectCache<Species> {
    protected readonly model = SpeciesModel;

    protected readonly cacheObjectTimeout = gameConfig.speciesCacheTimeout;

    protected documentToGameObject(document: Document): Species {
        return new Species(document);
    }

    public async fetchByCommonName(name: string): Promise<Species | undefined> {
        name = name.toLowerCase();

        const cachedSpecies = this.getMatchingFromCache(species => {
            const speciesHasCommonName = species.commonNamesLower.includes(name);

            return speciesHasCommonName;
        });

        if (cachedSpecies) {
            return cachedSpecies;
        }

        let speciesDocument: Document | null;
        try {
            speciesDocument = await SpeciesModel.findOne({ [Species.fieldNames.commonNamesLower]: name });
        }
        catch (error) {
            throw new Error(`There was an error finding a species by its common name: ${error}`);
        }

        if (!speciesDocument) {
            return;
        }

        const species = this.documentToGameObject(speciesDocument);
        
        try {
            await this.addToCache(species);
        }
        catch (error) {
            throw new Error(`There was an error adding a species to the cache: ${error}`);
        }

        return species;
    }
}