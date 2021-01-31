import { GuildMember, MessageEmbed, TextChannel, User } from "discord.js";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
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
import UpgradeCommand from "../commands/UpgradeCommand";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";
import SetEncounterChannelCommand from "../commands/SetEncounterChannelCommand";
import Emojis from "../beastiary/Emojis";

export default class EncounterMessage extends InteractiveMessage {
    protected readonly lifetime = 60000;

    public readonly channel: TextChannel;

    protected deactivationText = "(fled)";

    private readonly animal: Animal;

    private readonly initiatingPlayer?: Player;
    private _playerGuild?: PlayerGuild;

    private readonly capturingPlayers: Player[] = [];
    private readonly multiplayerCaptureWindow = 5000;

    private readonly warnedUserIds: Set<string> = new Set();

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, animal: Animal, player?: Player) {
        super(channel, beastiaryClient);

        this.addButton({
            name: "capture",
            emoji: Emojis.getReactionVersionByName("capture"),
            helpMessage: "Capture"
        });

        this.channel = channel;
        this.animal = animal;
        this.initiatingPlayer = player;

        if (player) {
            this._playerGuild = player.playerGuild;
        }
    }

    public get playerGuild(): PlayerGuild {
        if (!this._playerGuild) {
            throw new Error(stripIndent`
                An encounter message's player guild was attempted to be accessed before it was loaded.
            `);
        }

        return this._playerGuild;
    }

    public async build(): Promise<void> {
        if (this._playerGuild) {
            return;
        }

        try {
            this._playerGuild = await this.beastiaryClient.beastiary.playerGuilds.fetchByGuildId(this.channel.guild.id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player guild by the guild id of a random encounter's text channel.
            `);
        }
    }

    public async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        const species = this.animal.species;
        const card = this.animal.card;

        embed.setTitle(capitalizeFirstLetter(species.commonNames[0]));
        embed.setColor(species.rarityData.color);

        embed.addField("――――――――", `${species.rarityData.emoji} ${capitalizeFirstLetter(species.scientificName)}`, true);
        embed.setImage(card.url);

        if (card.breed) {
            embed.addField("Breed", capitalizeFirstLetter(card.breed), true);
        }

        if (card.special) {
            embed.addField("Special", capitalizeFirstLetter(card.special), true);
        }

        embed.setFooter("Wild encounter");

        if (this.initiatingPlayer) {
            if (this.initiatingPlayer.getCaptures(this.animal.species.id) > 0) {
                embed.appendToFooter(" (recorded)");
            }
            
            if (this.initiatingPlayer.freeEncounters.count === 3) {
                embed.appendToFooter("\n2 free encounters left!");
            }
            else if (this.initiatingPlayer.freeEncounters.count === 1) {
                embed.appendToFooter("\nLast free encounter!");
            }
        }

        if (!this.initiatingPlayer && !this.playerGuild.encounterChannelId) {
            embed.appendToFooter(`\n(Encounter spawned by message activity. Change the channel these appear in with the '${SetEncounterChannelCommand.primaryName}' command.)`);
        }

        return embed;
    }

    private warnPlayer(player: Player): void {
        if (this.warnedUserIds.has(player.member.user.id)) {
            return;
        }

        if (player.collectionFull) {
            betterSend(this.channel, `${player.member.user}, your collection is full! Either release some animals with \`${this.beastiaryClient.commandHandler.getPrefixByGuild(this.channel.guild)}release\`, or upgrade your collection size with the \`${UpgradeCommand.primaryName}\` command.`);
        }
        else if (player.capturesLeft < 1) {
            let noCapturesLeftString = `${player.member.user}, you can't capture an animal for another **${remainingTimeString(player.freeCaptures.nextReset)}**.`;

            if (!player.premium) {
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
        try {
            await this.animal.document.save();
        }
        catch (error) {
            throw new Error(stripIndent`
                A newly captured animal's document was unable to be saved.

                Animal: ${this.animal.debugString}
            `);
        }

        const commonName = this.animal.species.commonNameObjects[0];

        let captureString = stripIndent`
            ${player.member.user}, you caught ${commonName.article} ${commonName.name}!
            +**5**${Emojis.essence} (${commonName.name})
        `;

        if (player.getCaptures(this.animal.species.id) === 0) {
            captureString += `\n+**${gameConfig.newSpeciesPepReward}**${Emojis.pep} (caught new species)`;
        }

        if (player.totalCaptures <= 3) {
            captureString += `\n\nView your new animal with the \`${ViewCollectionCommand.primaryName}\` command, and give them a name with the \`${ChangeAnimalNicknameCommand.primaryName}\` command!`;
        }
        
        betterSend(this.channel, captureString);

        player.captureAnimal(this.animal, this.channel);

        console.log(`${player.member.user.tag} caught a ${this.animal.displayName} in ${this.channel.guild.name}!`);
        
        this.setDeactivationText("(caught)");
        this.deactivate();
    }

    private async awardToRandomPlayer(): Promise<void> {
        const playerWeightedChanceMap = new Map<Player, number>();

        for (const player of this.capturingPlayers) {
            playerWeightedChanceMap.set(player, 1);
        }

        let preferredPlayerWeight: number;
        if (this.capturingPlayers.length === 2) {
            preferredPlayerWeight = 2;
        }
        else {
            preferredPlayerWeight = Math.max(1, this.capturingPlayers.length - 1);
        }
        
        if (this.initiatingPlayer && this.capturingPlayers.includes(this.initiatingPlayer)) {
            playerWeightedChanceMap.set(this.initiatingPlayer, preferredPlayerWeight);
        }

        const winningPlayer = getWeightedRandom(playerWeightedChanceMap);

        this.awardAnimal(winningPlayer);

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

        if (this.capturingPlayers.includes(player)) {
            return;
        }

        this.capturingPlayers.push(player);
        this.beastiaryClient.beastiary.encounters.setPlayerCapturing(player, this.multiplayerCaptureWindow);

        const speciesName = this.animal.species.commonNameObjects[0];
        const speciesNameAndArticle = `${speciesName.article} ${speciesName.name}`;

        const captureWindowInSeconds = (this.multiplayerCaptureWindow / 1000).toPrecision(1);

        if (this.capturingPlayers.length === 1) {
            betterSend(this.channel, `${player.member.user.username} is capturing ${speciesNameAndArticle}, and they will get it after ${captureWindowInSeconds} seconds if nobody else reacts!`);

            setTimeout(() => {
                this.awardToRandomPlayer();
            }, this.multiplayerCaptureWindow);
        }
        else {
            betterSend(this.channel, `${player.member.user.username} is contesting ${this.capturingPlayers[0].member.user.username}'s capture of ${speciesNameAndArticle}!`)
        }
    }
}