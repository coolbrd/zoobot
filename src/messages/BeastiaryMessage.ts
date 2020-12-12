import { DMChannel, MessageEmbed, TextChannel } from "discord.js";
import { Species } from "../structures/GameObject/GameObjects/Species";
import LoadableCacheableGameObject from '../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObjects/LoadableCacheableGameObject';
import { bulkLoad } from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import PagedMessage from './PagedMessage';
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default class BeastiaryMessage extends PagedMessage<LoadableCacheableGameObject<Species>> {
    protected readonly lifetime = 60000;

    protected readonly fieldsPerPage = 6;
    protected readonly elementsPerField = 10;

    private readonly player: Player;

    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient, player: Player) {
        super(channel, beastiaryClient);

        this.player = player;
    }

    protected formatElement(loadableSpecies: LoadableCacheableGameObject<Species>): string {
        let speciesString = "";

        const species = loadableSpecies.gameObject;
        const speciesRarityEmoji = species.rarityData.emoji;

        speciesString += `${speciesRarityEmoji}`;

        if (this.player.hasToken(species.id)) {
            const tokenEmoji = this.beastiaryClient.beastiary.emojis.getByName("token");

            speciesString += `${tokenEmoji}`;
        }

        let speciesDisplayName = capitalizeFirstLetter(species.commonNames[0]);

        if (this.player.hasSpecies(species.id)) {
            speciesDisplayName = `**${speciesDisplayName}**`;
        }

        speciesString += ` ${speciesDisplayName}`;

        const playerSpeciesRecord = this.player.getSpeciesRecord(species.id);
        const speciesCaptures = playerSpeciesRecord.data.captures;

        if (speciesCaptures) {
            speciesString += ` **(${speciesCaptures})**`;
        }

        return speciesString;
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

        const embed = await super.buildEmbed()

        embed.setAuthor(`${this.player.member.user.username}'s Beastiary`, this.player.member.user.avatarURL() || undefined);
        embed.setColor(0x9e6734);

        return embed;
    }
}