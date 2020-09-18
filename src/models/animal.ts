import { Schema, Document, Types } from 'mongoose';

import { ImageSubObject, Species, SpeciesObject } from './species';

export const animalSchema = new Schema({
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

export interface AnimalTemplate {
    species: Types.ObjectId,
    image: Types.ObjectId,
    nickname?: string,
    experience: number
}

export class AnimalObject {
    private readonly document: Document;

    // The lightweight object equivalents of this animal's species and image
    // Not loaded by default in order to keep things as performant as possible
    private species: SpeciesObject | undefined;
    private image: ImageSubObject | undefined;

    constructor(animalDocument: Document) {
        this.document = animalDocument;
    }

    // Takes an array of animals and resolved once all of them are populated
    public static bulkPopulate(animals: AnimalObject[]): Promise<void> {
        // The number of animals whose population operation has been completed
        let completed = 0;
        
        // Return the promise that will resolve once everything is loaded
        return new Promise((resolve, reject) => {
            // Iterate over every animal given
            for (const animal of animals) {
                // Populate the current animal
                animal.populate().then(() => {
                    // Once the population is complete, check if all animals have been populated
                    if (++completed >= animals.length) {
                        // Resolve if all animals are done
                        resolve();
                    }
                // If an error is encountered while populating any of the animals
                }).catch(error => {
                    // Reject the promise
                    reject(error);
                });
            }
        });
    }

    public getId(): Types.ObjectId {
        return this.document._id;
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
        const speciesDocument = await Species.findById(this.document.get('species'));

        // If no document was found somehow
        if (!speciesDocument) {
            throw new Error('Animal object attempted to populate its species field with an invalid ID.');
        }

        // Convert the species document to an object and assign it
        this.species = new SpeciesObject(speciesDocument);

        // Finds this animal's corresponding image in its species
        const imageSubObject = this.getSpecies().images.find(image => {
            return image.getId().equals(this.document.get('image'));
        });

        // If no image object was found by the given ID, somehow
        if (!imageSubObject) {
            throw new Error('Animal object attempted to populate its image field with an invalid ID.');
        }

        // Assign this animal's image
        this.image = imageSubObject;
    }
}