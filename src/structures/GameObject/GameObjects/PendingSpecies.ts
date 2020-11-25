import GameObject from "../GameObject";
import { PendingSpeciesModel, pendingSpeciesSchemaDefinition } from '../../../models/PendingSpecies';

export default class PendingSpecies extends GameObject {
    public readonly model = PendingSpeciesModel;
    public readonly schemaDefinition = pendingSpeciesSchemaDefinition;

    public static readonly fieldNames = {
        commonNames: "commonNames",
        commonNamesLower: "commonNamesLower",
        scientificName: "scientificName",
        images: "images",
        description: "description",
        naturalHabitat: "naturalHabitat",
        wikiPage: "wikiPage",
        author: "author"
    };

    public get commonNames(): string[] {
        return this.document.get(PendingSpecies.fieldNames.commonNames);
    }

    public get scientificName(): string {
        return this.document.get(PendingSpecies.fieldNames.scientificName);
    }

    public get images(): string[] | undefined {
        return this.document.get(PendingSpecies.fieldNames.images);
    }

    public get description(): string | undefined {
        return this.document.get(PendingSpecies.fieldNames.description);
    }

    public get naturalHabitat(): string | undefined {
        return this.document.get(PendingSpecies.fieldNames.naturalHabitat);
    }

    public get wikiPage(): string | undefined {
        return this.document.get(PendingSpecies.fieldNames.wikiPage);
    }

    public get authorId(): string {
        return this.document.get(PendingSpecies.fieldNames.author);
    }
}
