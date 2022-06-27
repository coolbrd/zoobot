import { MessageEmbed, TextChannel } from "discord.js";
import Emojis from "../beastiary/Emojis";
import BeastiaryClient from "../bot/BeastiaryClient";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedMessage from "./PagedMessage";

interface PlayerRanking {
    name: string,
    value: (player: Player) => number,
    display: (player: Player) => string
}

export default class ServerLeaderBoardMessage extends PagedMessage {
    protected readonly lifetime = 60000;

    private readonly players: Player[];

    private readonly rankings: PlayerRanking[] = [
        {
            name: "pep",
            value: player => player.pep,
            display: player => String(player.pep) + Emojis.pep
        },
        {
            name: "Beastiary completion",
            value: player => player.beastiaryPercentComplete,
            display: player => player.beastiaryCompletionMedal + " " + player.beastiaryPercentComplete.toFixed(1) + "%"
        },
        {
            name: "tokens collected",
            value: player => player.tokenSpeciesIds.list.length,
            display: player => String(player.tokenSpeciesIds.list.length) + " " + Emojis.token
        },
        {
            name: "lifetime pep",
            value: player => player.lifetimePep,
            display: player => String(player.lifetimePep) + Emojis.pep
        },
        {
            name: "collection size",
            value: player => player.collectionAnimalIds.list.length,
            display: player => player.collectionAnimalIds.list.length.toString()
        },
        {
            name: "rarest tier caught",
            value: player => player.rarestTierCaught,
            display: player => Emojis.getRarity(player.rarestTierCaught) + " " + String(player.rarestTierCaught)
        },
        {
            name: "total captures",
            value: player => player.totalCaptures,
            display: player => player.totalCaptures.toString()
        }
    ];

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, players: Player[]) {
        super(channel, beastiaryClient);

        this.players = players.filter(player => player.member);
    }

    protected get pageCount(): number {
        return this.rankings.length;
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = await super.buildEmbed();

        const ranking = this.rankings[this.page];

        this.players.sort((player1, player2) => ranking.value(player2) - ranking.value(player1));

        embed.setAuthor({ name: `Top players: ${capitalizeFirstLetter(ranking.name)}` });
        embed.setColor(0xfc372d);
        
        const guildIcon = (this.channel as TextChannel).guild.iconURL();
        if (guildIcon) {
            embed.setThumbnail(guildIcon);
        }
        
        let leaderboardString = "";
        let currentPlace = 0;
        let lastValue: number | undefined;
        for (const player of this.players) {
            const value = ranking.value(player);

            if (value !== lastValue) {
                currentPlace++;
            }

            leaderboardString += `\`${currentPlace})\` ${player.tag}: **${ranking.display(player)}**\n`;

            lastValue = value;
        }
        embed.setDescription(leaderboardString);

        return embed;
    }
}