import { TextChannel, MessageEmbed } from "discord.js";
import { Player } from "../structures/GameObject/GameObjects/Player";
import AnimalDisplayMessage, { AnimalDisplayMessageState } from "./AnimalDisplayMessage";
import BeastiaryClient from "../bot/BeastiaryClient";
import { stripIndent } from "common-tags";
import Emojis from "../beastiary/Emojis";

export default class CollectionMessage extends AnimalDisplayMessage {
    protected readonly lifetime = 90000;

    protected readonly fieldsPerPage = 3;
    protected readonly elementsPerField = 10;

    protected numbered = true;
    
    private readonly player: Player;
    private readonly tag?: string;
    public readonly channel: TextChannel;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, player: Player, tag?: string) {
        super(channel, beastiaryClient, player.getAnimalsByTag(tag));

        this.player = player;
        this.tag = tag;
        this.channel = channel;

        if (this.tag) {
            this.numbered = false;
        }
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = await super.buildEmbed();

        const collection = this.elements;
        const userAvatar = this.player.avatarURL;

        let headerString: string;
        if (!this.tag) {
            headerString = `${this.player.username}'s collection`;
        }
        else {
            headerString = `Animals with "${this.tag}" tag`;
        }
        embed.setAuthor({ name: headerString, iconURL: userAvatar });

        let footerString: string;
        if (!this.tag) {
            footerString = `${collection.length} in collection (max ${this.player.collectionSizeLimit})`;
        }
        else {
            footerString = `${collection.length} tagged animals`;
        }
        embed.setFooter({ text: stripIndent`
            ${footerString}
            ${this.getButtonHelpString()}
        `});

        if (collection.length < 1) {
            if (!this.tag) {
                embed.setDescription(`It's empty in here. Try catching an animal with \`${this.beastiaryClient.commandHandler.getPrefixByGuild(this.channel.guild)}encounter\`!`);
            }
            else {
                embed.setDescription("You don't have any animals marked with this tag.");
            }
            return embed;
        }

        let totalValue: number;
        try {
            totalValue = await this.player.getTotalCollectionValue();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting a player's total collection value.

                ${error}
            `);
        }

        if (this.state === AnimalDisplayMessageState.page) {
            if (!this.tag) {
                embed.setDescription(`Total value: **${totalValue}**${Emojis.pep}`);
            }
        }
        else {
            embed.setTitle(`\`${collection.pointerPosition + 1})\` ${embed.title}`);
        }

        return embed;
    }
}