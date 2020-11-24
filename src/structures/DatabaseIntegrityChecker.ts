import { stripIndent } from "common-tags";
import { Document, Model } from "mongoose";
import { PlayerModel } from "../models/Player";
import { GuildModel } from "../models/PlayerGuild";
import { Player } from "./GameObject/GameObjects/Player";
import { PlayerGuild } from "./GameObject/GameObjects/PlayerGuild";

interface DatabaseIntegrityError {
    info: string,
    documents: Document[]
}

export default class DatabaseIntegrityChecker {
    private readonly errors: DatabaseIntegrityError[] = [];

    private async checkForDuplicateDocuments(model: Model<Document>, duplicateInfoString: string, areDuplicates: (document1: Document, document2: Document) => boolean): Promise<void> {
        let allDocuments: Document[];
        try {
            allDocuments = await model.find({});
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error finding all existing documents in a given model.

                ${error}
            `);
        }

        const checkedDocuments: Document[] = [];

        allDocuments.forEach(currentDocument => {
            const duplicateDocument = checkedDocuments.find(checkedDocument => {
                return areDuplicates(checkedDocument, currentDocument);
            });

            if (duplicateDocument) {
                const newError: DatabaseIntegrityError = {
                    info: duplicateInfoString,
                    documents: [currentDocument, duplicateDocument]
                }

                this.errors.push(newError);
            }

            checkedDocuments.push(currentDocument);
        });
    }

    private async checkForDuplicatePlayers(): Promise<void> {
        const playerDocumentsAreDuplicates = (playerDocument1: Document, playerDocument2: Document) => {
            const userIdMatch = playerDocument1.get(Player.fieldNames.userId) === playerDocument2.get(Player.fieldNames.userId);
            const guildIdMatch = playerDocument1.get(Player.fieldNames.guildId) === playerDocument2.get(Player.fieldNames.guildId);

            const areDuplicates = userIdMatch && guildIdMatch;

            return areDuplicates;
        }

        try {
            await this.checkForDuplicateDocuments(
                PlayerModel,
                "Two player documents that identified the same guild member were found.",
                playerDocumentsAreDuplicates);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error finding duplicate player documents.

                ${error}
            `);
        }
    }

    private async checkForDuplicateGuilds(): Promise<void> {
        const guildDocumentsAreDuplicates = (guildDocument1: Document, guildDocument2: Document) => {
            const guildIdMatch = guildDocument1.get(PlayerGuild.fieldNames.guildId) === guildDocument2.get(PlayerGuild.fieldNames.guildId);

            const areDuplicates = guildIdMatch;

            return areDuplicates;
        }

        try {
            await this.checkForDuplicateDocuments(
                GuildModel,
                "Two guild documents that identified the same guild were found.",
                guildDocumentsAreDuplicates);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error finding duplicate guild documents.

                ${error}
            `);
        }
    }

    public async run(): Promise<DatabaseIntegrityError[]> {
        try {
            await this.checkForDuplicatePlayers();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error checking for duplicate player documents.

                ${error}
            `);
        }

        try {
            await this.checkForDuplicateGuilds();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error checking for duplicate guild documents.

                ${error}
            `);
        }

        return this.errors;
    }
}

/*

- No animals in two collections at once
- No game objects with illegal stat values
x Only one document to represent each player
- Only one document to represent each guild
- No id references to nonexistent documents
- No duplicate ids in any reference list
- No animals without a collection reference
- No exceeding crew/collection size limits

*/