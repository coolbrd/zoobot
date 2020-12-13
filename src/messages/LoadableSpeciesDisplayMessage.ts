import { DMChannel, MessageEmbed, TextChannel } from "discord.js";
import { Species } from "../structures/GameObject/GameObjects/Species";
import LoadableGameObject, { bulkLoad } from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import PagedMessage from './PagedMessage';
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";

export default abstract class LoadableSpeciesDisplayMessage extends PagedMessage<LoadableGameObject<Species>> {
    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient, loadableSpecies: LoadableGameObject<Species>[]) {
        super(channel, beastiaryClient);

        this.elements = loadableSpecies;
    }
    
    protected async buildEmbed(): Promise<MessageEmbed> {
        try {
            await bulkLoad(this.visibleElements);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading all the species on the current page of a Beastiary message.

                Species on page: ${JSON.stringify(this.visibleElements)}
                
                ${error}
            `);
        }

        return await super.buildEmbed();
    }
}