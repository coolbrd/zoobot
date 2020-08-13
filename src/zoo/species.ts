export default class Species {
    readonly _id: string;
    readonly commonNames: string[];
    readonly images: string[];
    readonly scientificName: string;
    readonly family: string;
    readonly description: string;
    readonly naturalHabitat: string;
    readonly inGameRegion: string;
    readonly wikiPage: string;
    readonly tags: string[];
    readonly item: string;

    constructor(species: Species) {
        this._id = species[`_id`];
        this.commonNames = species[`commonNames`];
        this.images = species[`images`];
        this.scientificName = species[`scientificName`];
        this.family = species[`family`];
        this.description = species[`description`];
        this.naturalHabitat = species[`naturalHabitat`];
        this.inGameRegion = species[`inGameRegion`];
        this.wikiPage = species[`wikiPage`];
        this.tags = species[`tags`];
        this.item = species[`item`];
    }

    // Verify that all fields within the species are filled
    ensureFields(): void {
        // Iterate over every newly assigned value in this species
        if (Object.values(this).includes(undefined)) {
            throw new Error(`One or more necessary properties missing from species document.`);
        }
    }
}