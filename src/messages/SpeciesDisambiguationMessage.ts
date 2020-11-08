import { MessageEmbed } from "discord.js";
import SpeciesDisplayMessage from "./SpeciesDisplayMessage";

export default class SpeciesDisambiguationMessage extends SpeciesDisplayMessage {
    protected async buildEmbed(): Promise<MessageEmbed> {
        let embed: MessageEmbed;
        try {
            embed = await super.buildEmbed();
        }
        catch (error) {
            throw new Error(`There was an error building a species disambiguation message's inherited information: ${error}`);
        }

        embed.setColor(0xFFFF00);
        embed.setTitle("Multiple species found");
        embed.setFooter("Try again using the full name of the desired species");

        return embed;
    }
}