import { Document, Types } from "mongoose";
import gameConfig from "../config/gameConfig";
import { Species, SpeciesModel } from "../models/Species";
import GameObjectCache from "../structures/GameObjectCache";
import { encounterHandler } from './EncounterHandler';

export default class SpeciesManager extends GameObjectCache<Species> {
    protected readonly model = SpeciesModel;

    protected readonly cacheObjectTimeout = gameConfig.speciesCacheTimeout;

    private _allSpeciesIds: Types.ObjectId[] = [];

    public get allSpeciesIds(): Types.ObjectId[] {
        return this._allSpeciesIds;
    }

    private async loadAllSpeciesIds(): Promise<void> {
        let speciesDocuments: Document[];
        try {
            speciesDocuments = await SpeciesModel.find({});
        }
        catch (error) {
            throw new Error(`There was an error getting a list of all species from the database: ${error}`);
        }

        speciesDocuments.sort((a: Document, b: Document) => {
            return a.get("commonNamesLower")[0] > b.get("commonNamesLower")[0] ? 1 : -1;
        });

        this._allSpeciesIds = [];

        speciesDocuments.forEach(speciesDocument => {
            this.allSpeciesIds.push(speciesDocument._id);
        });
    }

    public async refreshSpecies(): Promise<void> {
        try {
            await this.loadAllSpeciesIds();
        }
        catch (error) {
            throw new Error(`There was an error loading all the species ids within the species manager: ${error}`);
        }

        try {
            await encounterHandler.loadRarityData();
        }
        catch (error) {
            throw new Error(`There was an error loading the encounter handler's species rarity information: ${error}`);
        }
    }

    public async init(): Promise<void> {
        try {
            await this.refreshSpecies();
        }
        catch (error) {
            throw new Error(`There was an error refreshing all species information while initializing the species manager: ${error}`);
        }
    }

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