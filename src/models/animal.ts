import mongoose, { Schema, Document, Types } from 'mongoose';

import { ImageSubObject, Species, SpeciesObject } from './species';

export const animalSchema = new Schema({
    species: {
        type: Schema.Types.ObjectId,
        ref: 'Species',
        required: true
    },
    owner: {
        type: String,
        required: true
    },
    server: {
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
    public readonly speciesID: Types.ObjectId;
    public readonly owner: string;
    public readonly server: string;
    public readonly imageID: Types.ObjectId;
    public readonly nickname: string | undefined;
    public readonly experience: number;

    // The lightweight object equivalents of this animal's species and image
    // Not loaded by default in order to keep things as performant as possible
    private species: SpeciesObject | undefined;
    private image: ImageSubObject | undefined;

    constructor(animalDocument: Document) {
        this.speciesID = animalDocument.get('species');
        this.owner = animalDocument.get('owner');
        this.server = animalDocument.get('server');
        this.imageID = animalDocument.get('image');
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

    // Checks if the animal's species is loaded
    public speciesLoaded(): boolean {
        return Boolean(this.species);
    }

    // Checks if the animal's image is loaded
    public imageLoaded(): boolean {
        return Boolean(this.image);
    }

    // Loads the animal's species object
    public async populateSpecies(): Promise<SpeciesObject> {
        // Get the Mongoose document that represents this animal's species
        const speciesDocument = await Species.findById(this.speciesID);

        // If no document was found somehow
        if (!speciesDocument) {
            throw new Error('Animal object attempted to populate its species field with an invalid ID.');
        }

        // Convert the species document into an object, assign it to this object, and return it
        return this.species = new SpeciesObject(speciesDocument);
    }

    // Loads the animal's image object
    public async populateImage(): Promise<ImageSubObject> {
        // Loads the animal's species (it has to), then find this animal's corresponding image in the resulting species object
        const imageSubObject = (await this.populateSpecies()).images.find(image => {
            return image._id.equals(this.imageID);
        });

        // If no image object was found by the given ID, somehow
        if (!imageSubObject) {
            throw new Error('Animal object attempted to populate its image field with an invalid ID.');
        }

        // Assign this animal's image and return it
        return this.image = imageSubObject;
    }
}