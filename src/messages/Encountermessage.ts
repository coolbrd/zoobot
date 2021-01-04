import { GuildMember, MessageEmbed, TextChannel, User } from "discord.js";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Species, SpeciesCard } from "../structures/GameObject/GameObjects/Species";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { remainingTimeString } from "../utility/timeStuff";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import gameConfig from "../config/gameConfig";
import ViewCollectionCommand from "../commands/ViewCollectionCommand";
import ChangeAnimalNicknameCommand from "../commands/ChangeAnimalNicknameCommand";
import { getWeightedRandom } from "../utility/weightedRarity";
import { inspect } from "util";

export default class EncounterMessage extends InteractiveMessage {
    protected readonly lifetime = 60000;

    public readonly channel: TextChannel;

    protected deactivationText = "(fled)";

    private readonly species: Species;
    private readonly card: SpeciesCard;

    private readonly initiatingPlayer?: Player;

    private readonly capturingPlayers: Player[] = [];
    private readonly multiplayerCaptureWindow = 5000;

    private readonly warnedUserIds: Set<string> = new Set();

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, species: Species, player?: Player) {
        super(channel, beastiaryClient);

        this.addButton({
            name: "capture",
            emoji: beastiaryClient.beastiary.emojis.getReactionVersionByName("capture"),
            helpMessage: "Capture"
        });

        this.channel = channel;
        this.species = species;
        this.card = this.species.getRandomCard();

        this.initiatingPlayer = player;
    }

    public async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        embed.setTitle(capitalizeFirstLetter(this.species.commonNames[0]));
        embed.setColor(this.species.rarityData.color);

        embed.addField("――――――――", `${this.species.rarityData.emoji} ${capitalizeFirstLetter(this.species.scientificName)}`, true);
        embed.setImage(this.card.url);

        if (this.card.breed) {
            embed.addField("Breed", capitalizeFirstLetter(this.card.breed), true);
        }

        if (this.card.special) {
            embed.addField("Special", capitalizeFirstLetter(this.card.special), true);
        }

        embed.setFooter("Wild encounter");

        if (this.initiatingPlayer) {
            if (this.initiatingPlayer.freeEncounters.count === 3) {
                embed.appendToFooter("\n2 free encounters left!");
            }
            else if (this.initiatingPlayer.freeEncounters.count === 1) {
                embed.appendToFooter("\nLast free encounter!");
            }
        }

        return embed;
    }

    private warnPlayer(player: Player): void {
        if (this.warnedUserIds.has(player.member.user.id)) {
            return;
        }

        if (player.collectionFull) {
            betterSend(this.channel, `${player.member.user}, your collection is full! Either release some animals with \`${this.beastiaryClient.commandHandler.getPrefixByGuild(this.channel.guild)}release\`, or upgrade your collection size.`);
        }
        else if (player.capturesLeft < 1) {
            let noCapturesLeftString = `${player.member.user}, you can't capture an animal for another **${remainingTimeString(player.freeCaptures.nextReset)}**.`;

            if (!player.getPremium()) {
                noCapturesLeftString += `\n\nWant more? Subscribe at <${gameConfig.patreonLink}> for exclusive premium features such as more encounters, captures, and xp!`;
            }

            betterSend(this.channel, noCapturesLeftString);
        }
        else if (this.beastiaryClient.beastiary.encounters.playerIsCapturing(player)) {
            betterSend(this.channel, `${player.member.user} you're already capturing another animal, you can only do one at a time!`);
        }

        this.warnedUserIds.add(player.member.user.id);
    }

    private async awardAnimal(player: Player): Promise<void> {
        const commonName = this.species.commonNameObjects[0];
        const essenceEmoji = this.beastiaryClient.beastiary.emojis.getByName("essence");

        let captureString = stripIndent`
            ${player.member.user}, you caught ${commonName.article} ${commonName.name}!
            +**5**${essenceEmoji} (${this.species.commonNames[0]})
        `;

        if (player.totalCaptures <= 3) {
            captureString += `\n\nView your new animal with the \`${ViewCollectionCommand.primaryName}\` command, and give them a name with the \`${ChangeAnimalNicknameCommand.primaryName}\` command!`;
        }
        
        betterSend(this.channel, captureString);
        
        this.setDeactivationText("(caught)");

        let newAnimal: Animal;
        try {
            newAnimal = await this.beastiaryClient.beastiary.animals.createAnimal(player, this.species, this.card);
        }
        catch (error) {
            betterSend(this.channel, "There was an error creating a new animal from this encounter, sorry if you didn't get your animal! Please report this and you can be compensated.");

            throw new Error(stripIndent`
                There was an error creating a new animal in an encounter message.

                Player: ${player.debugString}
                Species: ${this.species.debugString}
                Card: ${inspect(this.card)}
                
                ${error}
            `);
        }

        player.captureAnimal(newAnimal, this.channel);
    }

    private async awardToRandomPlayer(): Promise<void> {
        const playerWeightedChanceMap = new Map<Player, number>();

        const preferredPlayerWeight = Math.max(1, this.capturingPlayers.length - 1);
        playerWeightedChanceMap.set(this.capturingPlayers[0], preferredPlayerWeight);

        for (let i = 1; i < this.capturingPlayers.length; i++) {
            playerWeightedChanceMap.set(this.capturingPlayers[i], 1);
        }

        const winningPlayer = getWeightedRandom(playerWeightedChanceMap);

        this.awardAnimal(winningPlayer);
        this.deactivate();

        this.capturingPlayers.forEach(player => {
            this.beastiaryClient.beastiary.encounters.unsetPlayerCapturing(player);
        });
    }

    public async buttonPress(_buttonName: string, user: User): Promise<void> {
        let guildMember: GuildMember | undefined;
        try {
            guildMember = await getGuildMember(user.id, this.channel.guild.id, this.beastiaryClient);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting a guild member by a player's information.

                User id: ${user.id}
                Guild id: ${this.channel.guild.id}

                ${error}
            `);
        }

        if (!guildMember) {
            throw new Error(stripIndent`
                No guild member could be found for a user that pressed an encounter message button.

                User id: ${user.id}
                Guild id: ${this.channel.guild.id}
            `);
        }

        const player = await this.beastiaryClient.beastiary.players.safeFetch(guildMember);

        if (!player.canCapture) {
            this.warnPlayer(player);
            return;
        }

        this.beastiaryClient.beastiary.encounters.setPlayerCapturing(player, this.multiplayerCaptureWindow);

        if (this.capturingPlayers.includes(player)) {
            return;
        }

        const speciesName = this.species.commonNameObjects[0];
        const speciesNameAndArticle = `${speciesName.article} ${speciesName.name}`;

        const captureWindowInSeconds = (this.multiplayerCaptureWindow / 1000).toPrecision(1);

        if (this.capturingPlayers.length === 0) {
            betterSend(this.channel, `${player.member.user.username} is capturing ${speciesNameAndArticle}, and they will get it after ${captureWindowInSeconds} seconds if nobody else reacts!`);

            setTimeout(() => {
                this.awardToRandomPlayer();
            }, this.multiplayerCaptureWindow);
        }
        else {
            betterSend(this.channel, `${player.member.user.username} is contesting ${this.capturingPlayers[0].member.user.username}'s capture of ${speciesNameAndArticle}!`)
        }

        this.capturingPlayers.push(player);
    }
}