import { stripIndent } from "common-tags";
import { MessageEmbed, TextChannel } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";
import SmartEmbed from "../discordUtility/SmartEmbed";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";

export default class PlayerProfileMessage extends InteractiveMessage {
    protected readonly lifetime = 30000;

    private readonly player: Player;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, player: Player) {
        super(channel, beastiaryClient);

        this.player = player;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        let firstAnimal: Animal | undefined;
        if (this.player.collectionAnimalIds.length > 0) {
            try {
                firstAnimal = await this.player.fetchAnimalById(this.player.collectionAnimalIds[0]);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a player's first animal for use in a profile message.

                    Player: ${this.player.debugString}
                    
                    ${error}
                `);
            }
        }

        if (firstAnimal) {
            embed.setThumbnail(firstAnimal.card.url);

            const animalRarity = this.beastiaryClient.beastiary.encounters.getRarityInfo(firstAnimal.species.rarity);

            embed.setColor(animalRarity.color);
        }

        embed.setAuthor(`${this.player.member.user.username}'s profile`, this.player.member.user.avatarURL() || undefined);
        embed.setDescription(stripIndent`
            Scraps: **${this.player.scraps}**
            Tokens collected: **${this.player.tokenSpeciesIds.length}**

            Xp boosts remaining: **${this.player.xpBoostsLeft}**
            Encounters remaining: **${this.player.encountersLeft}**
            Captures remaining: **${this.player.capturesLeft}**
            Collection size: **${this.player.collectionAnimalIds.length}**

            Total xp boosts: **${this.player.totalXpBoosts}**
            Total encounters: **${this.player.totalEncounters}**
            Total captures: **${this.player.totalCaptures}**
        `);

        return embed;
    }
}