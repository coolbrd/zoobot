import { stripIndent } from "common-tags";
import { MessageEmbed, TextChannel } from "discord.js";
import { Types } from "mongoose";
import Emojis from "../beastiary/Emojis";
import BeastiaryClient from "../bot/BeastiaryClient";
import SmartEmbed from "../discordUtility/SmartEmbed";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default class PlayerProfileMessage extends InteractiveMessage {
    protected readonly lifetime = 30000;

    private readonly player: Player;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, player: Player) {
        super(channel, beastiaryClient);

        this.player = player;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        let displayAnimalId: Types.ObjectId | undefined;
        if (this.player.favoriteAnimalId) {
            displayAnimalId = this.player.favoriteAnimalId;
        }
        else if (this.player.collectionAnimalIds.list.length > 0) {
            displayAnimalId = this.player.collectionAnimalIds.list[0];
        }

        let displayAnimal: Animal | undefined;
        if (displayAnimalId) {
            try {
                displayAnimal = await this.player.fetchAnimalById(displayAnimalId);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a player's first animal for use in a profile message.

                    Player: ${this.player.debugString}
                    
                    ${error}
                `);
            }
        }

        embed.setAuthor({ name: `${this.player.username}'s profile`, iconURL: this.player.avatarURL });

        let descriptionString = "";

        if (displayAnimal) {
            embed.setThumbnail(displayAnimal.card.url);

            embed.setColor(displayAnimal.species.rarityData.color);

            if (this.player.favoriteAnimalId) {
                descriptionString += `Favorite animal: ${displayAnimal.displayName}\n\n`;
            }
        }

        const highestEssenceRecord = this.player.getHighestEssenceSpeciesRecord();

        let highestEssenceSpeciesString: string;
        if (highestEssenceRecord) {
            let highestEssenceSpecies: Species;
            try {
                highestEssenceSpecies = await this.beastiaryClient.beastiary.species.fetchById(highestEssenceRecord.speciesId);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a player's highest essence species in a player profile message.

                    Player: ${this.player.debugString}
                    Species id: ${highestEssenceRecord.speciesId}

                    ${error}
                `);
            }

            const speciesDisplayName = capitalizeFirstLetter(highestEssenceSpecies.getShowcaseDisplayName(this.player));

            highestEssenceSpeciesString = `${speciesDisplayName}: **${highestEssenceRecord.data.essence}**${Emojis.essence}`;
        }
        else {
            highestEssenceSpeciesString = "*None*";
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

        descriptionString += stripIndent`
            **${this.player.pep}**${Emojis.pep}
            Total collection value: **${totalValue}**${Emojis.pep}
            
            Collection size: **${this.player.collectionAnimalIds.list.length}**
            Tokens collected: **${this.player.tokenSpeciesIds.list.length}** ${Emojis.token}
            Highest tier caught: **${Emojis.getRarity(this.player.rarestTierCaught)} T${this.player.rarestTierCaught}**
            Beastiary complete: **${this.player.beastiaryPercentComplete.toPrecision(3)}%**
            Top species: ${highestEssenceSpeciesString}

            Xp boosts remaining: **${this.player.xpBoostsLeft}**
            Encounters remaining: **${this.player.encountersLeft}**
            Captures remaining: **${this.player.capturesLeft}**
            Prize balls remaining: **${this.player.prizeBalls}**

            Lifetime pep: **${this.player.lifetimePep}**${Emojis.pep}
            Total xp boosts: **${this.player.totalXpBoosts}**
            Total encounters: **${this.player.totalEncounters}**
            Total captures: **${this.player.totalCaptures}**
        `;

        if (this.player.premium) {
            descriptionString += "\n";

            if (this.player.playerPremium) {
                descriptionString += "\n**Player premium**";
            }

            if (this.player.playerGuild.premium) {
                descriptionString += "\n**Server premium**";
            }
        }

        embed.setDescription(descriptionString);

        return embed;
    }
}