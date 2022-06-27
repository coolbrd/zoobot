import { DMChannel, MessageEmbed, TextChannel } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedListMessage from "./PagedListMessage";

export default class SpeciesDisambiguationMessage extends PagedListMessage<Species> {
    protected readonly lifetime = 60000;

    protected readonly fieldsPerPage = 2;
    protected readonly elementsPerField = 10;

    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient, species: Species[]) {
        super(channel, beastiaryClient);

        this.elements = species;
    }

    protected formatElement(species: Species): string {
        const displayName = capitalizeFirstLetter(species.commonNames[0]);

        return displayName;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = await super.buildEmbed();

        embed.setColor(0xFFFF00);
        embed.setTitle("Multiple species found");
        embed.setFooter({  text: "Try again using the full name of the desired species" })

        return embed;
    }
}