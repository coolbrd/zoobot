import { TextChannel, MessageEmbed } from "discord.js";
import { Player } from "../structures/GameObject/GameObjects/Player";
import AnimalDisplayMessage, { AnimalDisplayMessageState } from "./AnimalDisplayMessage";
import BeastiaryClient from "../bot/BeastiaryClient";
import { stripIndent } from "common-tags";

export default class CollectionMessage extends AnimalDisplayMessage {
    protected readonly lifetime = 90000;

    protected readonly fieldsPerPage = 3;
    protected readonly elementsPerField = 10;
    
    private readonly player: Player;
    public readonly channel: TextChannel;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, player: Player) {
        super(channel, beastiaryClient, player.getCollectionAsLoadableAnimals());

        this.player = player;
        this.channel = channel;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = await super.buildEmbed();

        const collection = this.elements;
        const userAvatar = this.player.member.user.avatarURL() || undefined;

        const pepEmoji = this.beastiaryClient.beastiary.emojis.getByName("pep");

        embed.setAuthor(`${this.player.member.user.username}'s collection`, userAvatar);
        embed.setDescription(`Total value: **${this.player.totalCollectionValue}**${pepEmoji}`);

        embed.setFooter(stripIndent`
            ${collection.length} in collection (max ${this.player.collectionSizeLimit})
            ${this.getButtonHelpString()}
        `);

        if (collection.length < 1) {
            embed.setDescription(`It's empty in here. Try catching an animal with \`${this.beastiaryClient.commandHandler.getPrefixByGuild(this.channel.guild)}encounter\`!`);
            return embed;
        }

        if (this.state === AnimalDisplayMessageState.info || this.state === AnimalDisplayMessageState.card) {
            embed.setTitle(`\`${collection.pointerPosition + 1})\` ${embed.title}`);
        }

        return embed;
    }
}