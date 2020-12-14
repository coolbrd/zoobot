import { stripIndent } from "common-tags";
import { MessageEmbed, TextChannel } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";
import LoadableGameObject from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import LoadableGameObjectDisplayMessage from "./LoadableGameObjectDisplayMessage";

export default class EssenceDisplayMessage extends LoadableGameObjectDisplayMessage<Species> {
    protected readonly lifetime = 60000;

    protected readonly fieldsPerPage = 2;
    protected readonly elementsPerField = 15;

    private readonly player: Player;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, player: Player) {
        super(channel, beastiaryClient, player.getRecordedLoadableSpecies());

        this.player = player;
    }

    protected formatElement(loadableSpecies: LoadableGameObject<Species>): string {
        const species = loadableSpecies.gameObject;

        let speciesString = capitalizeFirstLetter(species.commonNames[0]);

        speciesString += `: ${this.player.getEssence(species.id)}`;

        return speciesString;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        let embed: MessageEmbed;
        try {
            embed = await super.buildEmbed();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error performing an essence message's inherited embed building behavior.

                ${error}
            `);
        }

        embed.setAuthor(`${this.player.member.user.username}'s essence`, this.player.member.user.avatarURL() || undefined);
        embed.setColor(0x00ff00);

        return embed;
    }
}