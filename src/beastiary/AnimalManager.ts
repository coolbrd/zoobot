import { Document, Types } from "mongoose";
import gameConfig from "../config/gameConfig";
import getGuildMember from "../discordUtility/getGuildMember";
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

    public async createAnimal(owner: Player, species: Species, card: SpeciesCard): Promise<Animal> {
        const animalDocument = Animal.newDocument(owner, species, card);

        try {
            await animalDocument.save();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error saving a new animal.
                
                Animal document: ${animalDocument.toString()}

                ${error}
            `);
        }

        const animal = this.documentToGameObject(animalDocument);

        try {
            await this.addToCache(animal);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a new animal to the animal cache.

                Animal: ${animal.debugString}
                
                ${error}
            `);
        }

        return animal;
    }

    public searchPlayerAnimal(searchTerm: string, player: Player): Animal | undefined {
        searchTerm = searchTerm.toLowerCase();

        const matchedAnimal = player.animals.find(animal => {
            const nicknameMatch = animal.nickname === searchTerm;
            const commonNameMatch = animal.species.commonNamesLower.includes(searchTerm);

            return nicknameMatch || commonNameMatch;
        });

        if (matchedAnimal) {
            return matchedAnimal;
        }

        const searchNumber = Number(searchTerm);

        if (!isNaN(searchNumber)) {
            const targetAnimalId = safeListAccess(player.collectionAnimalIds.list, searchNumber - 1);

            if (!targetAnimalId) {
                return undefined;
            }

            const targetAnimal = player.animals.find(animal => animal.id.equals(targetAnimalId));

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
        let animal: Animal | undefined;
        try {
            AnimalModel.findOne({
                [Animal.fieldNames.guildId]: guildId,
                $text: {
                    $search: searchTerm
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

        return animal;
    }

    public async searchPlayerOrGuildAnimal(searchTerm: string, player: Player, guildId: string): Promise<Animal | undefined> {
        const playerAnimal = this.searchPlayerAnimal(searchTerm, player);

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