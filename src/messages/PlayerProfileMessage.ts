import { stripIndents } from "common-tags";
import { MessageEmbed, TextChannel } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import SmartEmbed from "../discordUtility/SmartEmbed";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { Animal } from "../models/Animal";
import { Player } from "../models/Player";

export default class PlayerProfileMessage extends InteractiveMessage {
    protected readonly lifetime = 30000;

    private readonly player: Player;

    constructor(channel: TextChannel, player: Player) {
        super(channel);

        this.player = player;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        let firstAnimal: Animal | undefined;
        if (this.player.collectionAnimalIds.length > 0) {
            try {
                firstAnimal = await beastiary.animals.fetchById(this.player.collectionAnimalIds[0]);
            }
            catch (error) {
                throw new Error(`There was an error fetching a player's first animal for use in a profile message: ${error}`);
            }
        }

        if (firstAnimal) {
            embed.setThumbnail(firstAnimal.card.url);
        }

        embed.setAuthor(`${this.player.member.user.username}'s profile`, this.player.member.user.avatarURL() || undefined);
        embed.setDescription(stripIndents`
            Scraps: **${this.player.scraps}**
            Encounters remaining: **${this.player.encountersLeft}**
            Captures remaining: **${this.player.capturesLeft}**
            Collection size: **${this.player.collectionAnimalIds.length}**

            Total encounters: **${this.player.totalEncounters}**
            Total captures: **${this.player.totalCaptures}**
        `);

        return embed;
    }
}