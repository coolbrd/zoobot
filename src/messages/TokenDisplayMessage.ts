import { stripIndent } from "common-tags";
import { MessageEmbed, TextChannel } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";
import { bulkLoad } from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import LoadableCacheableGameObject from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObjects/LoadableCacheableGameObject";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedMessage from "./PagedMessage";

export default class TokenDisplayMessage extends PagedMessage<LoadableCacheableGameObject<Species>> {
    public readonly fieldsPerPage = 1;
    public readonly elementsPerField = 15;

    public readonly lifetime = 30000;

    private readonly player: Player;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, player: Player) {
        super(channel, beastiaryClient);

        this.player = player;
        this.elements = player.getTokenLoadableSpecies();
    }

    protected formatElement(loadableSpecies: LoadableCacheableGameObject<Species>): string {
        const token = capitalizeFirstLetter(loadableSpecies.gameObject.token);

        return token;
    }

    public async buildEmbed(): Promise<MessageEmbed> {
        try {
            await bulkLoad(this.visibleElements);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error bulk loading the species within a token display message.

                Visible species: ${JSON.stringify(this.visibleElements)}
            `);
        }

        const embed = await super.buildEmbed();

        embed.setAuthor(`${this.player.member.user.username}'s tokens`, this.player.member.user.avatarURL() || undefined);
        embed.setColor(0x008888);
        embed.setFooter(`${this.elements.length} tokens collected`);

        return embed;
    }
}