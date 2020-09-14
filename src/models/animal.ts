import mongoose, { Schema, Document, Types } from 'mongoose';

import { ImageSubObject, Species, SpeciesObject } from './species';

export const animalSchema = new Schema({
    species: {
        type: Schema.Types.ObjectId,
        ref: 'Species',
        required: true
    },
    ownerId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
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

// A lightweight and convenient object representing a captured animal
// I only mention "lightweight and convenient" because something like this is smaller than a Mongoose document and easier to use
export class AnimalObject {
    public readonly _id: Types.ObjectId;
    public readonly speciesId: Types.ObjectId;
    public readonly owner: string;
    public readonly server: string;
    public readonly imageId: Types.ObjectId;
    public readonly nickname: string | undefined;
    public readonly experience: number;

    // The lightweight object equivalents of this animal's species and image
    // Not loaded by default in order to keep things as performant as possible
    private species: SpeciesObject | undefined;
    private image: ImageSubObject | undefined;

    constructor(animalDocument: Document) {
        this._id = animalDocument._id;
        this.speciesId = animalDocument.get('species');
        this.owner = animalDocument.get('owner');
        this.server = animalDocument.get('server');
        this.imageId = animalDocument.get('image');
        this.experience = animalDocument.get('experience');
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

    // Checks if the animal's reference fields are loaded
    public populated(): boolean {
        return Boolean(this.species) && Boolean(this.image);
    }

    // Loads the animal's species and image
    public async populate(): Promise<void> {
        // Get the Mongoose document that represents this animal's species
        const speciesDocument = await Species.findById(this.speciesId);

        // If no document was found somehow
        if (!speciesDocument) {
            throw new Error('Animal object attempted to populate its species field with an invalid ID.');
        }

        // Convert the species document to an object and assign it
        this.species = new SpeciesObject(speciesDocument);

        // Finds this animal's corresponding image in its species
        const imageSubObject = this.getSpecies().images.find(image => {
            return image._id.equals(this.imageId);
        });

        // If no image object was found by the given ID, somehow
        if (!imageSubObject) {
            throw new Error('Animal object attempted to populate its image field with an invalid ID.');
        }

        // Assign this animal's image
        this.image = imageSubObject;
    }
}