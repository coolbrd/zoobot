import { stripIndents } from "common-tags";
import { DMChannel, TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import gameConfig from "../config/gameConfig";
import { betterSend } from "../discordUtility/messageMan";
import SpeciesDisambiguationMessage from "../messages/SpeciesDisambiguationMessage";
import { SpeciesModel } from "../models/Species";
import { Species } from "../structures/GameObject/GameObjects/Species";
import GameObjectCache from "../structures/GameObject/GameObjectCache";
import { encounterHandler } from './EncounterHandler';
import UnknownSpecies from '../structures/GameObject/GameObjects/UnknownSpecies';

export default class SpeciesManager extends GameObjectCache<Species> {
    protected readonly model = SpeciesModel;

    protected readonly cacheObjectTimeout = gameConfig.speciesCacheTimeout;

    private _allSpeciesIds: Types.ObjectId[] = [];

    public async fetchById(id: Types.ObjectId): Promise<Species> {
        let species: Species | undefined;
        try {
            species = await super.fetchById(id);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error fetching a species by its id.
                Id: ${id}
            `);
        }

        if (!species) {
            species = new UnknownSpecies();
        }

        return species;
    }

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
            return a.get(Species.fieldNames.commonNamesLower)[0] > b.get(Species.fieldNames.commonNamesLower)[0] ? 1 : -1;
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

    private async fetchSpeciesAndCheckForCommonNameMatch(speciesDocuments: Document[], searchedCommonName: string): Promise<Species[]> {
        const speciesList: Species[] = [];

        if (speciesDocuments.length < 1) {
            return speciesList;
        }

        try {
            await new Promise(resolve => {
                let completed = 0;
                speciesDocuments.forEach(currentSpeciesDocument => {
                    this.fetchById(currentSpeciesDocument._id).then(currentSpecies => {
                        if (!currentSpecies) {
                            throw new Error(stripIndents`
                                An invalid species id was encountered during a common name match check.
                                Id: ${currentSpeciesDocument._id}
                            `);
                        }

                        speciesList.push(currentSpecies);

                        if (++completed >= speciesDocuments.length) {
                            resolve();
                        }
                    }).catch(error => {
                        throw new Error(`There was an error fetching a species by its id after matching it by a common name substring: ${error}`);
                    });
                });
            });
        }
        catch (error) {
            throw new Error(`There was an error bulk fetching a set of matching species while searching for species by a common name substring: ${error}`);
        }

        for (const currentSpecies of speciesList) {
            for (const currentCommonName of currentSpecies.commonNamesLower) {
                if (currentCommonName === searchedCommonName) {
                    return [currentSpecies];
                }
            }
        }

        return speciesList;
    }

    public async searchByCommonNameSubstring(searchTerm: string): Promise<Species[]> {
        searchTerm = searchTerm.toLowerCase();

        let matchingSpeciesDocuments: Document[];
        try {
            matchingSpeciesDocuments = await SpeciesModel.find({ $text: { $search: searchTerm } });
        }
        catch (error) {
            throw new Error(`There was an error finding a species by its common name: ${error}`);
        }

        let matchingSpecies: Species[];
        try {
            matchingSpecies = await this.fetchSpeciesAndCheckForCommonNameMatch(matchingSpeciesDocuments, searchTerm);
        }
        catch (error) {
            throw new Error(`There was an error fetching a list of species and checking for common name exact matches: ${error}`);
        }

        return matchingSpecies;
    }

    public async searchSingleSpeciesByCommonNameAndHandleDisambiguation(searchTerm: string, channel: TextChannel | DMChannel): Promise<Species | undefined> {
        let matchingSpecies: Species[];
        try {
            matchingSpecies = await this.searchByCommonNameSubstring(searchTerm);
        }
        catch (error) {
            throw new Error(`There was an error searching a species by a common name substring: ${error}`);
        }

        if (matchingSpecies.length === 0) {
            betterSend(channel, `No species by the name "${searchTerm}" exists.`);
            return undefined;
        }
        else if (matchingSpecies.length === 1) {
            return matchingSpecies[0];
        }
        else {
            const disambiguationMessage = new SpeciesDisambiguationMessage(channel, matchingSpecies);
            try {
                await disambiguationMessage.send();
            }
            catch (error) {
                throw new Error(`There was an error sending a species disambiguation message: ${error}`);
            }
            return undefined;
        }
    }
}