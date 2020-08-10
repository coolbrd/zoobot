export default class Species {
    readonly commonNames: string[];
    readonly images: string[];
    readonly scientificName: string;
    readonly family: string;
    readonly description: string;
    readonly naturalHabitat: string;
    readonly inGameRegion: string;
    readonly tags: string[];
    readonly item: string;

    constructor(species: any) {
        this.commonNames = species["commonNames"];
        this.images = species["images"];
        this.scientificName = species["scientificName"];
        this.family = species["family"];
        this.description = species["description"];
        this.naturalHabitat = species["naturalHabitat"];
        this.inGameRegion = species["inGameRegion"];
        this.tags = species["tags"];
        this.item = species["item"];

        // Iterate over every newly assigned value in this species
        Object.values(this).forEach(propertyValue => {
            // If any properties are undefined
            if (propertyValue == undefined) {
                throw new Error(`One or more necessary properties missing from species document of id ${species["_id"]}.`);
            }
        });
    }
}