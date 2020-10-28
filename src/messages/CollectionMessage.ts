import { TextChannel, MessageEmbed } from "discord.js";
import { Player } from "../models/Player";
import { commandHandler } from "../structures/CommandHandler";
import AnimalDisplayMessage, { AnimalDisplayMessageState } from "./AnimalDisplayMessage";

// The message displaying a player's animal collection
export default class CollectionMessage extends AnimalDisplayMessage {
    protected readonly lifetime = 90000;

    protected readonly elementsPerPage = 10;
    
    private readonly player: Player;
    public readonly channel: TextChannel;

    constructor(channel: TextChannel, player: Player) {
        super(channel, player.collectionAnimalIds);

        this.player = player;
        this.channel = channel;
    }

    // Builds the current page of the collection's embed
    protected async buildEmbed(): Promise<MessageEmbed> {
        let embed: MessageEmbed;
        try {
            embed = await super.buildEmbed();
        }
        catch (error) {
            throw new Error(`There was an error building a collection message's inherited embed information: ${error}`);
        }

        // Make it more clear what we're working with here
        const collection = this.elements;

        const userAvatar = this.player.member.user.avatarURL() || undefined;
        embed.setAuthor(`${this.player.member.user.username}'s collection`, userAvatar);
        embed.setFooter(`${collection.length} in collection (max ${this.player.collectionSizeLimit})\n${this.getButtonHelpString()}`);

        // Don't try anything crazy if the user's collection is empty
        if (collection.length < 1) {
            embed.setDescription(`It's empty in here. Try catching an animal with \`${commandHandler.getGuildPrefix(this.channel.guild)}encounter\`!`);
            return embed;
        }

        if (this.state === AnimalDisplayMessageState.info || this.state === AnimalDisplayMessageState.card) {
            embed.setTitle(`\`${collection.pointerPosition + 1})\` ${embed.title}`);
        }

        return embed;
    }
}