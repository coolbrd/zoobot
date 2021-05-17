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
import { indexWhere } from "../utility/arraysAndSuch";

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

    private checkForDuplicateDocuments(allDocuments: Document[], duplicateInfoString: string, areDuplicates: (document1: Document, document2: Document) => boolean, handleDuplicates?: (document1: Document, document2: Document) => void): void {
        const checkedDocuments: Document[] = [];

        allDocuments.forEach(currentDocument => {
            const duplicateDocument = checkedDocuments.find(checkedDocument => {
                return areDuplicates(checkedDocument, currentDocument);
            });

            if (duplicateDocument) {
                this.addError(duplicateInfoString, [currentDocument, duplicateDocument]);

                if (handleDuplicates) {
                    handleDuplicates(currentDocument, duplicateDocument);
                }
            }

            checkedDocuments.push(currentDocument);
        });
    }

    private deleteLesserPlayerDocument(player1: Document, player2: Document): void {
        const player1CollectionIds = player1.get(Player.fieldNames.collectionAnimalIds) as Types.ObjectId[];
        const player2CollectionIds = player2.get(Player.fieldNames.collectionAnimalIds) as Types.ObjectId[];

        let greaterPlayer: Document;
        let lesserPlayer: Document;
        if (player1CollectionIds.length > player2CollectionIds.length) {
            greaterPlayer = player1;
            lesserPlayer = player2;
        }
        else {
            greaterPlayer = player2;
            lesserPlayer = player1;
        }
        
        lesserPlayer.deleteOne().then(() => console.log(`Deleted lesser duplicate player document: ${lesserPlayer._id}`));
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
            playerDocumentsAreDuplicates,
            this.deleteLesserPlayerDocument
        );
    }

    private deleteLesserPlayerGuildDocument(guild1: Document, guild2: Document): void {
        const guild1HasPrefix = guild1.get(PlayerGuild.fieldNames.prefix) !== "b/";

        let greaterGuild: Document;
        let lesserGuild: Document;
        if (guild1HasPrefix) {
            greaterGuild = guild1;
            lesserGuild = guild2;
        }
        else {
            greaterGuild = guild2;
            lesserGuild = guild1;
        }
        
        lesserGuild.deleteOne().then(() => console.log(`Deleted lesser duplicate guild document: ${lesserGuild._id}`));
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
            guildDocumentsAreDuplicates,
            this.deleteLesserPlayerGuildDocument
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

    private removeAnimalIdFromPlayer(animalId: Types.ObjectId, playerDocument: Document) {
        const collectionIds = playerDocument.get(Player.fieldNames.collectionAnimalIds) as Types.ObjectId[];
        const crewIds = playerDocument.get(Player.fieldNames.crewAnimalIds) as Types.ObjectId[];

        const indexInCollection = indexWhere(collectionIds, id => id.equals(animalId));
        if (indexInCollection !== -1) {
            collectionIds.splice(indexInCollection, 1);
        }

        const indexInCrew = indexWhere(crewIds, id => id.equals(animalId));
        if (indexInCrew !== -1) {
            crewIds.splice(indexInCrew, 1);
        }

        playerDocument.save();
    }

    private validateAnimalOwnership(allAnimals: Document[], allPlayers: Document[]): void {
        for (const currentPlayerDocument of allPlayers) {
            const collectionAnimalIds: Types.ObjectId[] = currentPlayerDocument.get(Player.fieldNames.collectionAnimalIds);

            for (const currentAnimalId of collectionAnimalIds) {
                const idKey = this.idToKey(currentAnimalId);

                const otherOwner = this.ownedAnimals.get(idKey);

                if (otherOwner) {
                    this.addError(stripIndent`
                            An animal id that exists in the collections of two players was found. Fixing.

                            Id: ${currentAnimalId}
                        `,
                        [otherOwner, currentPlayerDocument]
                    );

                    const targetAnimalDocument = allAnimals.find(animal => currentAnimalId.equals(animal._id));

                    if (!targetAnimalDocument) {
                        this.addError(stripIndent`
                            An animal id that exists in two players' collections doesn't map to an existing animal document. Removing from collections.

                            Id: ${currentAnimalId}
                        `, []);

                        this.removeAnimalIdFromPlayer(currentAnimalId, currentPlayerDocument);
                        this.removeAnimalIdFromPlayer(currentAnimalId, otherOwner);
                    }
                    else {
                        const realOwnerId = targetAnimalDocument._id as Types.ObjectId;

                        let realOwner: Document;
                        let invalidOwner: Document;
                        if (realOwnerId.equals(currentPlayerDocument._id)) {
                            realOwner = currentPlayerDocument;
                            invalidOwner = otherOwner;
                        }
                        else {
                            realOwner = otherOwner;
                            invalidOwner = currentPlayerDocument;
                        }

                        this.removeAnimalIdFromPlayer(currentAnimalId, invalidOwner);
                    }
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

            if (!this.ownedAnimals.has(idKey)) {
                this.addError("An animal whose id isn't in any collection was found. Fixing.", [currentAnimalDocument]);

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

    public async run(): Promise<void> {
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

        this.logErrors(this.errors);
    }

    private logErrors(errors: DatabaseIntegrityError[]): void {
        if (errors.length > 0) {
            console.log("Database integrity error(s) detected:");
            errors.forEach(currentError => {
                let errorString = currentError.info;

                currentError.documents.forEach(currentErrorDocument => {
                    errorString += `\nDocument:\n${currentErrorDocument.toString()}`;
                });
                console.log(stripIndent`
                    Error:

                    ${errorString}
                `);
            });
        }
        else {
            console.log("Database integrity check passed");
        }
    }
}