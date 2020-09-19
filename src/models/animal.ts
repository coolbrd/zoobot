import mongoose, { Schema, Document, Types } from 'mongoose';

import { ImageSubObject, SpeciesObject } from './species';

export const animalSchema = new Schema({
    ownerId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    species: {
        type: Schema.Types.ObjectId,
        ref: 'Species',
        required: true
    },
    image: {
        type: Schema.Types.ObjectId,
        required: true
    },
    nickname: {
        type: String,
        required: false
    },
    experience: {
        type: Number,
        required: true
    }
});

export const Animal = mongoose.model('Animal', animalSchema);

// A wrapper object for an animal's Mongoose document
export class AnimalObject {
    private readonly id: Types.ObjectId;

    private document: Document | undefined;

    private loaded = false;

    private species: SpeciesObject | undefined;
    private image: ImageSubObject | undefined;

    constructor(animalInfo: { animalId?: Types.ObjectId, animalDocument?: Document }) {
        if (animalInfo.animalId) {
            this.id = animalInfo.animalId;
        }
        else if (animalInfo.animalDocument) {
            this.id = animalInfo.animalDocument._id;
            this.document = animalInfo.animalDocument;
            this.loaded = true;
        }
        else {
            throw new Error('Insufficient information provided for animal object.');
        }
    }

    public getId(): Types.ObjectId {
        return this.getDocument()._id;
    }

    public async load(): Promise<void> {
        if (this.isLoaded()) {
            return;
        }

        const animalDocument = await Animal.findById(this.id);

        if (!animalDocument) {
            throw new Error('No animal document by an animal object\'s id was found during load.');
        }

        this.document = animalDocument;

        this.species = new SpeciesObject({speciesId: this.getSpeciesId()});
        await this.species.load();

        // Get the array of all images of the animal's species
        const speciesImages = this.getSpecies().getImages();
        // Set the animal's image to the one that corresponds to this animal's image id
        this.image = speciesImages.find(speciesImage => {
            return this.getImageId().equals(speciesImage.getId());
        });

        this.loaded = true;
    }

    public async refresh(): Promise<void> {
        this.loaded = false;
        this.load();
    }

    public isLoaded(): boolean {
        return this.loaded;
    }

    private getDocument(): Document {
        if (!this.document) {
            throw new Error('Tried to get an AnimalObject\'s document before it was loaded.');
        }

        return this.document;
    }

    public getOwnerId(): string {
        return this.getDocument().get('ownerId');
    }

    public getGuildId(): string {
        return this.getDocument().get('guildId');
    }

    public getSpeciesId(): Types.ObjectId {
        return this.getDocument().get('species');
    }

    public getImageId(): Types.ObjectId {
        return this.getDocument().get('image');
    }

    // Gets the species object representing this animal's species
    public getSpecies(): SpeciesObject {
        if (!this.species) {
            throw new Error('Tried to get an AnimalObject\'s species before it was loaded.');
        }

        return this.species;
    }

    // Gets the image object representing this animal's image
    public getImage(): ImageSubObject {
        if (!this.image) {
            throw new Error('Tried to get an AnimalObject\'s image before it was loaded.');
        }

        return this.image;
    }

    public getExperience(): number {
        return this.getDocument().get('experience');
    }

    public async delete(): Promise<void> {
        try {
            await this.getDocument().deleteOne();
        }
        catch (error) {
            console.error('There was an error trying to delete an animal object.');
            throw new Error(error);
        }
    }
}