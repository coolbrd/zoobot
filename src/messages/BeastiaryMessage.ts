import { DMChannel, MessageEmbed, TextChannel } from "discord.js";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { Species } from "../structures/GameObject/GameObjects/Species";
import LoadableCacheableGameObject from '../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObjects/LoadableCacheableGameObject';
import { bulkLoad } from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedMessage from './PagedMessage';
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { Player } from "../structures/GameObject/GameObjects/Player";

export default class BeastiaryMessage extends PagedMessage<LoadableCacheableGameObject<Species>> {
    protected readonly lifetime = 60000;

    protected readonly elementsPerPage = 60;

    private readonly player: Player;

    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient, player: Player) {
        super(channel, beastiaryClient);

        this.player = player;
    }

    private async buildLoadableSpeciesList(): Promise<void> {
        this.beastiaryClient.beastiary.species.allSpeciesIds.forEach(currentSpeciesId => {
            const loadableSpecies = new LoadableCacheableGameObject(currentSpeciesId, this.beastiaryClient.beastiary.species);
            this.elements.push(loadableSpecies);
        });
    }

    private sortElementsByPlayerCaptureCount(): void {
        this.elements.sort((a, b) => {
            const recordA = this.player.getSpeciesRecord(a.id);
            const recordB = this.player.getSpeciesRecord(b.id);

            return recordB.data.captures - recordA.data.captures;
        });
    }

    private sortElementsByPlayerTokenStatus(): void {
        this.elements.sort((a, b) => {
            const hasTokenA = this.player.hasToken(a.id) ? 1 : 0;
            const hasTokenb = this.player.hasToken(b.id) ? 1 : 0;

            return hasTokenb - hasTokenA;
        });
    }

    public async build(): Promise<void> {
        try {
            await this.buildLoadableSpeciesList();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting the ids of all species in a Beastiary message.
                
                ${error}
            `);
        }

        this.sortElementsByPlayerCaptureCount();

        this.sortElementsByPlayerTokenStatus();

        try {
            await super.build();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error building the inherited information in a Beastiary message.
                
                ${error}
            `);
        }
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

        const embed = new SmartEmbed();

        embed.setAuthor(`${this.player.member.user.username}'s Beastiary`, this.player.member.user.avatarURL() || undefined);
        embed.setColor(0x9e6734);

        const elementsPerField = this.elementsPerPage / 6;

        let currentFieldCount = 0;
        let currentFieldString = "";

        const addFieldAndReset = () => {
            embed.addField("----", currentFieldString, true);
            currentFieldCount = 0;
            currentFieldString = "";
        }

        this.visibleElements.forEach(loadableSpecies => {
            if (currentFieldCount === elementsPerField) {
                addFieldAndReset();
            }

            const speciesRarityEmoji = loadableSpecies.gameObject.rarityData.emoji;

            currentFieldString += `${speciesRarityEmoji}`;

            if (this.player.hasToken(loadableSpecies.id)) {
                const tokenEmoji = this.beastiaryClient.beastiary.emojis.getByName("token");

                currentFieldString += `${tokenEmoji}`;
            }

            currentFieldString += ` ${capitalizeFirstLetter(loadableSpecies.gameObject.commonNames[0])}`;

            const playerSpeciesRecord = this.player.getSpeciesRecord(loadableSpecies.gameObject.id);
            const speciesCaptures = playerSpeciesRecord.data.captures;

            if (speciesCaptures) {
                currentFieldString += ` **(${speciesCaptures})**`;
            }

            currentFieldString += "\n";

            currentFieldCount++;
        });

        if (currentFieldString) {
            addFieldAndReset();
        }

        embed.setFooter(`Page ${this.page + 1}/${this.pageCount}\n${this.getButtonHelpString()}`);

        return embed;
    }
}