import mongoose, { Document, Schema, Types } from "mongoose";

import { Animal, AnimalObject } from "./animal";

const playerSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    animals: {
        type: [Schema.Types.ObjectId],
        required: true
    }
});

export const Player = mongoose.model('Player', playerSchema);

// A wrapper object for a Mongoose player document
export class PlayerObject {
    private id: Types.ObjectId;

    private document: Document | undefined;

    constructor(playerId: Types.ObjectId) {
        this.id = playerId;
    }

    public getId(): Types.ObjectId {
        return this.id;
    }

    public async load(): Promise<void> {
        const playerDocument = await Player.findById(this.getId());

        if (!playerDocument) {
            throw new Error('A player object couldn\'t find a corresponding document with its given id.');
        }

        this.document = playerDocument;
    }

    private getDocument(): Document {
        if (!this.document) {
            throw new Error('A player\'s document was attempted to be read before it was loaded.');
        }

        return this.document;
    }

    public getUserId(): string {
        return this.getDocument().get('userId');
    }

    public getGuildId(): string {
        return this.getDocument().get('guildId');
    }

    public getAnimalIds(): Types.ObjectId[] {
        return this.getDocument().get('animals');
    }

    public async getAnimalObjects(): Promise<AnimalObject[]> {
        const animalIds = this.getDocument().get('animals');

        const animalObjects: AnimalObject[] = [];

        animalIds.forEach((animalId: Types.ObjectId) => {
            animalObjects.push(new AnimalObject({animalId: animalId}));
        });

        return animalObjects;
    }

    public async addAnimal(animalId: Types.ObjectId): Promise<void> {
        await this.getDocument().updateOne({
            $push: {
                animals: animalId
            }
        });
    }

    public async removeAnimal(animalId: Types.ObjectId): Promise<void> {
        await this.getDocument().updateOne({
            $pull: {
                animals: animalId
            }
        });
    }
}