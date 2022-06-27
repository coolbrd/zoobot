import { DMChannel, MessageEmbed, TextChannel } from "discord.js";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { Player } from "../structures/GameObject/GameObjects/Player";
import LoadableGameObjectDisplayMessage from "./LoadableGameObjectDisplayMessage";
import LoadableGameObject from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";

export default class BeastiaryMessage extends LoadableGameObjectDisplayMessage<Species> {
    protected readonly lifetime = 60000;

    protected readonly fieldsPerPage = 6;
    protected readonly elementsPerField = 10;

    private readonly player: Player;

    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient, player: Player) {
        super(channel, beastiaryClient, beastiaryClient.beastiary.species.getAllLoadableSpecies());

        this.player = player;
    }

    protected formatElement(loadableSpecies: LoadableGameObject<Species>): string {
        const species = loadableSpecies.gameObject;

        let showcaseName = species.getShowcaseDisplayName(this.player);

        const hasBeenCaptured = this.player.getSpeciesRecord(species.id).data.captures > 0;

        if (hasBeenCaptured) {
            showcaseName += "*";
        }

        return showcaseName;
    }

    private sortElementsByEssence(): void {
        this.elements.sort((a, b) => {
            const essenceA = this.player.getEssence(a.id);
            const essenceB = this.player.getEssence(b.id);

            return essenceB - essenceA;
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
        this.sortElementsByEssence();

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
        let embed: MessageEmbed;
        try {
            embed = await super.buildEmbed();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error performing inherited embed building information in a Beastiary message.
                
                ${error}
            `);
        }

        const playerSpeciesRecorded = this.player.totalRecordedSpecies;
        const totalSpeciesCount = this.beastiaryClient.beastiary.species.allSpeciesIds.length;

        const beastiaryCompletion = this.player.beastiaryPercentComplete;

        embed.setDescription(`${this.player.beastiaryCompletionMedal} ${beastiaryCompletion.toPrecision(3)}% of all species recorded. (${playerSpeciesRecorded}/${totalSpeciesCount})`);

        embed.setAuthor({ name: `${this.player.username}'s Beastiary`, iconURL: this.player.avatarURL });
        embed.setColor(0x9e6734);

        return embed;
    }
}