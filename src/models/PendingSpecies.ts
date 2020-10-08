import mongoose, { Schema } from 'mongoose';
import DocumentWrapper from '../structures/DocumentWrapper';

// The schema for a pending species submission
export const pendingSpeciesSchema = new Schema({
    commonNames: {
        type: [String],
        required: true,
    },
    commonNamesLower: {
        type: [String],
        required: true
    },
    scientificName: {
        type: String,
        required: true,
    },
    images: {
        type: [String],
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    naturalHabitat: {
        type: String,
        required: false,
    },
    wikiPage: {
        type: String,
        required: false,
    },
    author: {
        type: String,
        required: true
    }
});

export const PendingSpecies = mongoose.model('PendingSpecies', pendingSpeciesSchema);

export class PendingSpeciesObject extends DocumentWrapper {
    public getCommonNames(): string[] {
        return this.getDocument().get('commonNames');
    }

    public getScientificName(): string {
        return this.getDocument().get('scientificName');
    }

    public getImages(): string[] | undefined {
        return this.getDocument().get('images');
    }

    public getDescription(): string | undefined {
        return this.getDocument().get('description');
    }

    public getNaturalHabitat(): string | undefined {
        return this.getDocument().get('naturalHabitat');
    }

    public getWikiPage(): string | undefined {
        return this.getDocument().get('wikiPage');
    }

    public getAuthorId(): string {
        return this.getDocument().get('author');
    }
}