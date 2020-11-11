import { DMChannel, MessageEmbed, TextChannel } from "discord.js";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedMessage from "./PagedMessage";

export default class SpeciesDisplayMessage extends PagedMessage<Species> {
    protected readonly lifetime = 30000;

    protected readonly elementsPerPage = 15;

    constructor(channel: TextChannel | DMChannel, species: Species[]) {
        super(channel);

        this.elements = species;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        let pageString = "";
        this.visibleElements.forEach(currentSpecies => {
            pageString += `${capitalizeFirstLetter(currentSpecies.commonNames[0])}\n`;
        });

        embed.setDescription(pageString);

        return embed;
    }
}