import { Document } from "mongoose";
import gameConfig from "../config/gameConfig";
import { AnimalModel } from "../models/Animal";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { Species, SpeciesCard } from "../structures/GameObject/GameObjects/Species";
import GameObjectCache from "../structures/GameObject/GameObjectCache";
import { stripIndent } from "common-tags";
import { safeListAccess } from "../utility/arraysAndSuch";

export default class AnimalManager extends GameObjectCache<Animal> {
    protected readonly model = AnimalModel;

    protected readonly cacheObjectTimeout = gameConfig.cachedGameObjectTimeout;

    protected documentToGameObject(document: Document): Animal {
        return new Animal(document, this.beastiaryClient);
    }

    public async createAnimal(species: Species, card: SpeciesCard, guildId: string): Promise<Animal> {
        const animalDocument = Animal.newDocument(species, card, guildId);

        let animal: Animal;
        try {
            animal = await this.addDocumentToCache(animalDocument);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a new animal document to the animal cache.

                Document: ${animalDocument.toString()}
                
                ${error}
            `);
        }

        return animal;
    }

    public async searchPlayerAnimal(searchTerm: string, player: Player): Promise<Animal | undefined> {
        searchTerm = searchTerm.toLowerCase();

        let animals: Animal[];
        try {
            animals = await player.getAnimals();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player's animals in the sort collection command.

                ${error}
            `);
        }

        const matchedAnimal = animals.find(animal => {
            const nicknameMatch = animal.nickname && animal.nickname.toLowerCase() === searchTerm;
            const commonNameMatch = animal.species.commonNamesLower.includes(searchTerm);

            return nicknameMatch || commonNameMatch;
        });

        if (matchedAnimal) {
            return matchedAnimal;
        }

        let searchNumber;
        if (searchTerm === "last") {
            searchNumber = player.collectionAnimalIds.list.length;
        }
        else {
            searchNumber = Number(searchTerm);
        }

        if (!isNaN(searchNumber)) {
            const targetAnimalId = safeListAccess(player.collectionAnimalIds.list, searchNumber - 1);

            if (!targetAnimalId) {
                return undefined;
            }

            const targetAnimal = animals.find(animal => animal.id.equals(targetAnimalId));

            if (!targetAnimal) {
                throw new Error(stripIndent`
                    An animal id with no animal instance was found in a player object during a search.

                    Animal id: ${targetAnimalId}
                    Player: ${player.debugString}
                `);
            }

            return targetAnimal;
        }
    }

    public async searchGuildAnimal(searchTerm: string, guildId: string): Promise<Animal | undefined> {
        const cachedAnimal = this.getMatchingFromCache(animal => animal.nickname === searchTerm);

        if (cachedAnimal) {
            return cachedAnimal;
        }

        let animalDocument: Document | null;
        try {
            animalDocument = await AnimalModel.findOne({
                [Animal.fieldNames.guildId]: guildId,
                $text: {
                    $search: `"${searchTerm}"`
                }
            });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error searching for an animal in a guild.

                Search term: ${searchTerm}
                Guild id: ${guildId}

                ${error}
            `);
        }

        if (!animalDocument) {
            return undefined;
        }

        let animal: Animal;
        try {
            animal = await this.addDocumentToCache(animalDocument);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a searched animal document to the animal cache.

                Document: ${animalDocument.toString()}

                ${error}
            `);
        }

        return animal;
    }

    public async searchPlayerOrGuildAnimal(searchTerm: string, player: Player, guildId: string): Promise<Animal | undefined> {
        const playerAnimal = await this.searchPlayerAnimal(searchTerm, player);

        if (playerAnimal) {
            return playerAnimal;
        }

        let guildAnimal: Animal | undefined;
        try {
            guildAnimal = await this.searchGuildAnimal(searchTerm, guildId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error searching for a guild animal after no match was made in a player search.

                ${error}
            `);
        }

        return guildAnimal;
    }
}