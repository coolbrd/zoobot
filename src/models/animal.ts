import mongoose, { Schema, Document, Types } from 'mongoose';

import DocumentWrapper from '../structures/documentWrapper';
import { errorHandler } from '../structures/errorHandler';
import { Player, PlayerObject } from './player';
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

Animal.collection.createIndex({ nickname: 'text' });

// An animal's version of a Mongoose document wrapper
// Allows for animal information to be loaded, reloaded, and set more easily
export class AnimalObject extends DocumentWrapper {
    // The object representations of this animal object's fields
    private species: SpeciesObject | undefined;
    private image: ImageSubObject | undefined;

    // Take required information for a DocumentWrapper, along with optional fields for pre-loaded species and image objects
    // This could have optional fields for just the species and image documents, but it's easier to just convert those to their object forms before passing them in
    constructor(documentInfo: {documentId?: Types.ObjectId, document?: Document, speciesObject?: SpeciesObject, imageSubObject?: ImageSubObject}) {
        super({documentId: documentInfo.documentId, document: documentInfo.document});

        // If a species object was provided, use it
        if (documentInfo.speciesObject) {
            this.species = documentInfo.speciesObject;
        }

        // If an image object was provided, use it
        if (documentInfo.imageSubObject) {
            this.image = documentInfo.imageSubObject;
        }
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

    public getNickname(): string {
        return this.getDocument().get('nickname');
    }

    public getExperience(): number {
        return this.getDocument().get('experience');
    }

    public async setNickname(newNickname: string | null): Promise<void> {
        await this.getDocument().updateOne({
            $set: {
                nickname: newNickname
            }
        });
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

    public getName(): string {
        return this.getNickname() || this.getSpecies().getCommonNames()[0];
    }

    // Gets this animal's position within its owner's inventory
    public async getInventoryIndex(): Promise<number> {
        let ownerDocument: Document | null;
        // Get the animal's owner object
        try {
            ownerDocument = await Player.findOne({
                userId: this.getOwnerId()
            });
        }
        catch (error) {
            throw new Error('There was an error finding an animal\'s owner\'s player object.');
        }

        if (!ownerDocument) {
            throw new Error('An animal with an invalid owner id tried to get its owner object.');
        }

        const ownerObject = new PlayerObject({ document: ownerDocument });

        // Return this animal's place in its owner's inventory
        return ownerObject.getAnimalIds().indexOf(this.getId());
    }

    public speciesLoaded(): boolean {
        return Boolean(this.species);
    }

    public imageLoaded(): boolean {
        return Boolean(this.image);
    }

    // Whether or not every one of this animal's fields are loaded and ready to go
    public fullyLoaded(): boolean {
        return super.fullyLoaded() && this.speciesLoaded() && this.imageLoaded();
    }

    // Loads this animal's document from its id
    private async loadDocument(): Promise<void> {
        // If the document is already known/loaded, do nothing
        if (this.documentLoaded()) {
            return;
        }

        // Find the animal's document and set it
        const animalDocument = await Animal.findById(this.getId());
        if (!animalDocument) {
            throw new Error('No animal document by an animal object\'s id was found during load.');
        }
        this.setDocument(animalDocument);
    }

    // Loads this animal's species object
    private async loadSpecies(): Promise<void> {
        if (!this.documentLoaded()) {
            throw new Error('An animal\'s species was attempted to be loaded before its document was loaded.');
        }

        // If this animal's species is already known/loaded, do nothing
        if (this.speciesLoaded()) {
            return;
        }

        // Create a new species object from this animal's known species id
        this.species = new SpeciesObject({documentId: this.getSpeciesId()});
        // Load the species object's information
        await this.species.load();
    }

    // Loads this animal's image object
    private loadImage(): void {
        // If this animal's image object is known/loaded, do nothing
        if (this.imageLoaded()) {
            return;
        }

        // Get the array of all images of the animal's species
        const speciesImages = this.getSpecies().getImages();

        // Set the animal's image to the one that corresponds to this animal's image id
        this.image = speciesImages.find(speciesImage => {
            return this.getImageId().equals(speciesImage.getId());
        });

        // Make sure that an image was found from that search
        if (!this.image) {
            throw new Error('An animal\'s image couldn\'t be found in the images of its species.');
        }
    }

    // Load all the animal's fields
    public async load(): Promise<void> {
        // If all fields are already loaded, do nothing
        if (this.fullyLoaded()) {
            return;
        }

        // Load the animal's document
        try {
            await this.loadDocument();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error loading an animal\'s document.');
            return;
        }

        // Then its species
        try {
            await this.loadSpecies();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error loading an animal\'s species.');
            return;
        }

        // Then its image
        this.loadImage();
    }

    // Unloads all the animal's fields
    public unload(): void {
        super.unload();
        this.species = undefined;
        this.image = undefined;
    }

    // Delete's the animal's document from the database
    public async delete(): Promise<void> {
        try {
            await this.getDocument().deleteOne();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error trying to delete an animal object.');
        }
    }
}