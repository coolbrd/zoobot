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

export default class EncounterMessage extends InteractiveMessage {
    protected readonly lifetime = 60000;

    public readonly channel: TextChannel;

    protected deactivationText = "(fled)";

    private readonly species: Species;
    private readonly card: SpeciesCard;

    private readonly player?: Player;

    private readonly warnedUserIds: string[] = [];

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

        this.player = player;
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

        if (this.player) {
            if (this.player.freeEncounters.count === 3) {
                embed.appendToFooter("\n2 free encounters left!");
            }
            else if (this.player.freeEncounters.count === 1) {
                embed.appendToFooter("\nLast free encounter!");
            }
        }

        return embed;
    }

    private warnPlayer(player: Player): void {
        if (!this.warnedUserIds.includes(player.member.user.id)) {
            if (player.collectionFull) {
                betterSend(this.channel, `${player.member.user}, your collection is full! Either release some animals with \`${this.beastiaryClient.commandHandler.getPrefixByGuild(this.channel.guild)}release\`, or upgrade your collection size.`);
            }
            else {
                let noCapturesLeftString = `${player.member.user}, you can't capture an animal for another **${remainingTimeString(player.freeCaptures.nextReset)}**.`;

                if (!player.getPremium()) {
                    noCapturesLeftString += `\n\nWant more? Subscribe at <${gameConfig.patreonLink}> for exclusive premium features such as more encounters, captures, and xp!`;
                }

                betterSend(this.channel, noCapturesLeftString);
            }

            this.warnedUserIds.push(player.member.user.id);
        }
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

        const commonName = this.species.commonNameObjects[0];

        const essenceEmoji = this.beastiaryClient.beastiary.emojis.getByName("essence");

        let captureString = stripIndent`
            ${user}, you caught ${commonName.article} ${commonName.name}!
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
            betterSend(this.channel, "There was an error creating a new animal from an encounter, sorry if you didn't get your animal! Please report this to the developer and you can be compensated.");

            throw new Error(stripIndent`
                There was an error creating a new animal in an encounter message.

                Player: ${player.debugString}
                Species: ${this.species.debugString}
                Card: ${JSON.stringify(this.card)}
                
                ${error}
            `);
        }

        player.captureAnimal(newAnimal, this.channel);

        this.deactivate();
    }
}