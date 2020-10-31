import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { Species } from "../models/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import AllSpeciesMessage from './AllSpeciesMessage';

export default class BeastiaryMessage extends AllSpeciesMessage {
    protected readonly lifetime = 60000;

    protected readonly elementsPerPage = 15;

    private readonly user: User;

    constructor(channel: TextChannel | DMChannel, user: User) {
        super(channel);

        this.user = user;
    }
    
    protected async buildEmbed(): Promise<MessageEmbed> {
        try {
            await this.loadSpeciesOnPage();
        }
        catch (error) {
            throw new Error(`There was an error loading all the species on the current page of a Beastiary message: ${error}`);
        }

        const embed = new SmartEmbed();

        embed.setAuthor(`${this.user.username}'s Beastiary`, this.user.avatarURL() || undefined);

        let pageString = "";
        this.visibleElements.forEach(loadableSpecies => {
            loadableSpecies.species = loadableSpecies.species as Species;
            pageString += capitalizeFirstLetter(loadableSpecies.species.commonNames[0]) + "\n";
        });

        embed.setDescription(pageString);

        embed.setFooter(`Page ${this.page + 1}/${this.pageCount}\n${this.getButtonHelpString()}`);

        return embed;
    }
}