import mongoose, { Document, Schema } from "mongoose";
import { GuildConfigObject, guildConfigSchema } from "./guildConfig";

const guildScema = new Schema({
    id: {
        type: String,
        required: true
    },
    config: {
        type: guildConfigSchema,
        required: true
    }
});

export const GuildModel = mongoose.model('Guild', guildScema);

// A wrapper class for a Mongoose document. Used to simplify and restrict data access.
export class GuildObject {
    private readonly document: Document;

    constructor(guildDocument: Document) {
        this.document = guildDocument;
    }

    public getId(): string {
        return this.document.get('id');
    }

    public getPrefix(): string {
        return this.document.get('config.prefix');
    }

    public async setPrefix(newPrefix: string): Promise<void> {
        // Attempt to update the guild's prefix
        try {
            await this.document.updateOne({
                $set: {
                    'config.prefix': newPrefix
                }
            });
        }
        catch (error) {
            console.error('There was an error updating a guild model in the change prefix command.');
            throw new Error(error);
        }
    }
}