import { DMChannel, TextChannel } from "discord.js";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import LoadableGameObjectDisplayMessage from "./LoadableGameObjectDisplayMessage";
import LoadableGameObject from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default class SpeciesRarityMessage extends LoadableGameObjectDisplayMessage<Species> {
    protected readonly lifetime = 60000;

    protected readonly fieldsPerPage = 6;
    protected readonly elementsPerField = 10;

    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient) {
        super(channel, beastiaryClient, beastiaryClient.beastiary.species.getAllLoadableSpecies());
    }

    protected formatElement(loadableSpecies: LoadableGameObject<Species>): string {
        const species = loadableSpecies.gameObject;

        const commonName = capitalizeFirstLetter(species.commonNames[0]);
        const rarity = this.beastiaryClient.beastiary.encounters.getWeightedRarityMinimumOccurrence(species.rarity);

        return `${commonName}: ${(rarity * 100).toPrecision(3)}%`;
    }
}