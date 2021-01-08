import { stripIndent } from "common-tags";
import { Document, Types } from "mongoose";
import { AnimalModel, animalSchemaDefinition } from '../models/Animal';
import { PlayerModel, playerSchemaDefinition } from "../models/Player";
import { GuildModel, playerGuildSchemaDefinition } from "../models/PlayerGuild";
import { BeastiarySchemaDefinition, BeastiarySchemaOptions } from './schema/BeastiarySchema';
import { Player } from "./GameObject/GameObjects/Player";
import { PlayerGuild } from "./GameObject/GameObjects/PlayerGuild";
import { findRestrictedFieldValueErrors, IllegalValueError } from './schema/SchemaFieldRestrictions';
import { Animal } from './GameObject/GameObjects/Animal';

interface DatabaseIntegrityError {
    info: string,
    documents: Document[]
}

export default class DatabaseIntegrityChecker {
    private readonly errors: DatabaseIntegrityError[] = [];

    private readonly ownedAnimals = new Map<string, Document>();

    private addError(info: string, documents: Document[]): void {
        const newError: DatabaseIntegrityError = {
            info: info,
            documents: documents
        };

        this.errors.push(newError);
    }

    private idToKey(id: Types.ObjectId): string {
        return id.toHexString();
    }

    private keyToId(key: string): Types.ObjectId {
        return Types.ObjectId.createFromHexString(key);
    }

    private checkDocumentForIllegalValues(document: Document, schemaDefinition: BeastiarySchemaDefinition): void {
        for (const fieldName of Object.keys(schemaDefinition)) {
            const schemaField = schemaDefinition[fieldName] as BeastiarySchemaOptions;

            const documentValue = document.get(fieldName);

            if (schemaField.required && documentValue === undefined) {
                this.addError(
                    stripIndent`
                        An empty required field was found. Fixing.

                        Field name: ${fieldName}
                    `,
                    [document]
                );

                if (schemaField.fieldRestrictions && schemaField.fieldRestrictions.defaultValue !== undefined) {
                    document.updateOne({ [fieldName]: schemaField.fieldRestrictions.defaultValue }).exec();
                }
            }

            if (schemaField.fieldRestrictions) {
                const fieldError = findRestrictedFieldValueErrors(documentValue, schemaField.fieldRestrictions);

                if (fieldError !== undefined) {
                    this.addError(
                        stripIndent`
                            An illegal value was found in a document. Fixing.

                            Field name: ${fieldName}
                            Value: ${documentValue}
                        `,
                        [document]
                    );

                    if (fieldError === IllegalValueError.negative || fieldError === IllegalValueError.wrongType) {
                        document.updateOne({
                            $set: {
                                [fieldName]: schemaField.fieldRestrictions.defaultValue
                            }
                        }).exec();
                    }
                }
            }
        }
    }

    private checkAllDocumentsForIllegalValues(allDocuments: Document[], schemaDefinition: BeastiarySchemaDefinition): void {
        allDocuments.forEach(currentDocument => {
            this.checkDocumentForIllegalValues(currentDocument, schemaDefinition);
        });
    }

    private checkForDuplicateDocuments(allDocuments: Document[], duplicateInfoString: string, areDuplicates: (document1: Document, document2: Document) => boolean): void {
        const checkedDocuments: Document[] = [];

        allDocuments.forEach(currentDocument => {
            const duplicateDocument = checkedDocuments.find(checkedDocument => {
                return areDuplicates(checkedDocument, currentDocument);
            });

            if (duplicateDocument) {
                this.addError(duplicateInfoString, [currentDocument, duplicateDocument]);
            }

            checkedDocuments.push(currentDocument);
        });
    }

    private checkForDuplicatePlayers(allPlayers: Document[]): void {
        const playerDocumentsAreDuplicates = (playerDocument1: Document, playerDocument2: Document) => {
            const userIdMatch = playerDocument1.get(Player.fieldNames.userId) === playerDocument2.get(Player.fieldNames.userId);
            const guildIdMatch = playerDocument1.get(Player.fieldNames.guildId) === playerDocument2.get(Player.fieldNames.guildId);

            const areDuplicates = userIdMatch && guildIdMatch;

            return areDuplicates;
        }

        this.checkForDuplicateDocuments(
            allPlayers,
            "Two player documents that identified the same guild member were found.",
            playerDocumentsAreDuplicates
        );
    }

    private checkForDuplicatePlayerGuilds(allGuilds: Document[]): void {
        const guildDocumentsAreDuplicates = (guildDocument1: Document, guildDocument2: Document) => {
            const guildIdMatch = guildDocument1.get(PlayerGuild.fieldNames.guildId) === guildDocument2.get(PlayerGuild.fieldNames.guildId);

            const areDuplicates = guildIdMatch;

            return areDuplicates;
        }

        this.checkForDuplicateDocuments(
            allGuilds,
            "Two guild documents that identified the same guild were found.",
            guildDocumentsAreDuplicates
        );
    }

    private addAnimalIdToPlayerCollection(playerDocument: Document, id: Types.ObjectId): void {
        playerDocument.updateOne({
            $push: {
                [Player.fieldNames.collectionAnimalIds]: id
            }
        }).exec();
    }

    private findPlayerByUserAndGuildId(allPlayers: Document[], userId: string, guildId: string): Document | undefined {
        const ownerDocument = allPlayers.find(playerDocument => {
            const userMatch = userId === playerDocument.get(Player.fieldNames.userId);
            const guildMatch = guildId === playerDocument.get(Player.fieldNames.guildId);

            return userMatch && guildMatch;
        });

        return ownerDocument;
    }

    private validateAnimalOwnership(allAnimals: Document[], allPlayers: Document[]): void {
        for (const currentPlayerDocument of allPlayers) {
            const collectionAnimalIds: Types.ObjectId[] = currentPlayerDocument.get(Player.fieldNames.collectionAnimalIds);

            for (const currentAnimalId of collectionAnimalIds) {
                const idKey = this.idToKey(currentAnimalId);

                const otherOwner = this.ownedAnimals.get(idKey);

                if (otherOwner) {
                    this.addError(stripIndent`
                            An animal id that exists in the collections of two players was found.

                            Id: ${currentAnimalId}
                        `,
                        [otherOwner, currentPlayerDocument]
                    );
                }
                else {
                    this.ownedAnimals.set(idKey, currentPlayerDocument);
                }

                const existingAnimal = allAnimals.find(animal => currentAnimalId.equals(animal._id));

                if (!existingAnimal) {
                    this.addError(stripIndent`
                        An animal id that doesn't match to any animal that exists was found in a player's collection. Fixing.

                        Id: ${currentAnimalId}
                    `, [currentPlayerDocument]);

                    const invalidIdIndex = collectionAnimalIds.indexOf(currentAnimalId);

                    collectionAnimalIds.splice(invalidIdIndex, 1);

                    currentPlayerDocument.save();
                }
                else {
                    const animalUserId = existingAnimal.get(Animal.fieldNames.userId);
                    const animalOwnerId = existingAnimal.get(Animal.fieldNames.ownerId);

                    if (!animalUserId) {
                        this.addError(stripIndent`
                            An owned animal with no user id was found. Fixing.
                        `, [currentPlayerDocument, existingAnimal]);

                        const playerUserId = currentPlayerDocument.get(Player.fieldNames.userId);

                        existingAnimal.updateOne({
                            $set: {
                                [Animal.fieldNames.userId]: playerUserId
                            }
                        }).exec();
                    }

                    if (!animalOwnerId) {
                        this.addError(stripIndent`
                            An owned animal with no owner id was found. Fixing.
                        `, [currentPlayerDocument, existingAnimal]);

                        const playerOwnerId = currentPlayerDocument._id;

                        existingAnimal.updateOne({
                            $set: {
                                [Animal.fieldNames.ownerId]: playerOwnerId
                            }
                        }).exec();
                    }
                }
            }
        }

        for (const currentAnimalDocument of allAnimals) {
            if (!currentAnimalDocument.get(Animal.fieldNames.userId)) {
                continue;
            }
            
            const id: Types.ObjectId = currentAnimalDocument._id;

            const idKey = this.idToKey(id);
            const animalIsAway = currentAnimalDocument.get(Animal.fieldNames.away);

            if (!this.ownedAnimals.has(idKey) && !animalIsAway) {
                this.addError("An animal that isn't away whose id isn't in any collection was found. Fixing.", [currentAnimalDocument]);

                const ownerDocument = this.findPlayerByUserAndGuildId(
                    allPlayers,
                    currentAnimalDocument.get(Animal.fieldNames.userId),
                    currentAnimalDocument.get(Animal.fieldNames.guildId)
                );

                if (!ownerDocument) {
                    this.addError("An animal with no collection reference is owned by a player that doesn't exist anymore.", [currentAnimalDocument]);
                }
                else {
                    this.addAnimalIdToPlayerCollection(ownerDocument, id);

                    currentAnimalDocument.updateOne({
                        [Animal.fieldNames.ownerId]: ownerDocument._id
                    }).exec();
                }
            }
        }
    }

    public async run(): Promise<DatabaseIntegrityError[]> {
        let allPlayers: Document[];
        try {
            allPlayers = await PlayerModel.find({});
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting all player documents during an integrity check.

                ${error}
            `);
        }

        let allPlayerGuilds: Document[];
        try {
            allPlayerGuilds = await GuildModel.find({});
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting all player guild documents during an integrity check.

                ${error}
            `);
        }

        let allAnimals: Document[];
        try {
            allAnimals = await AnimalModel.find({});
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting all animal documents during an integrity check.

                ${error}
            `);
        }

        this.checkForDuplicatePlayers(allPlayers);
        this.checkForDuplicatePlayerGuilds(allPlayerGuilds);

        this.checkAllDocumentsForIllegalValues(allPlayers, playerSchemaDefinition);
        this.checkAllDocumentsForIllegalValues(allPlayerGuilds, playerGuildSchemaDefinition);
        this.checkAllDocumentsForIllegalValues(allAnimals, animalSchemaDefinition);

        this.validateAnimalOwnership(allAnimals, allPlayers);

        return this.errors;
    }
}