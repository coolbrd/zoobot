import { MessageEmbed, TextChannel, User } from "discord.js";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Species, SpeciesCard } from "../structures/GameObject/GameObjects/Species";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { beastiary } from "../beastiary/Beastiary";
import { encounterHandler } from "../beastiary/EncounterHandler";
import { remainingTimeString } from "../utility/timeStuff";
import { commandHandler } from "../structures/Command/CommandHandler";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { stripIndents } from "common-tags";

export default class EncounterMessage extends InteractiveMessage {
    protected readonly lifetime = 60000;

    public readonly channel: TextChannel;

    protected deactivationText = "(fled)";

    private readonly species: Species;
    private readonly card: SpeciesCard;

    private readonly warnedUserIds: string[] = [];

    constructor(channel: TextChannel, species: Species) {
        super(channel);

        this.addButton({
            name: "capture",
            emoji: "🔘",
            helpMessage: "Capture"
        });

        this.channel = channel;
        this.species = species;
        this.card = this.species.getRandomCard();
    }

    public async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();
        
        embed.setColor(encounterHandler.getRarityInfo(this.species.rarity).color);
        embed.setTitle(capitalizeFirstLetter(this.species.commonNames[0]));
        embed.addField("――――――――", capitalizeFirstLetter(this.species.scientificName), true);
        embed.setImage(this.card.url);

        if (this.card.breed) {
            embed.addField("Breed", capitalizeFirstLetter(this.card.breed), true);
        }

        if (this.card.special) {
            embed.addField("Special", capitalizeFirstLetter(this.card.special), true);
        }

        embed.setFooter("Wild encounter");

        return embed;
    }

    public async buttonPress(_buttonName: string, user: User): Promise<void> {
        const guildMember = getGuildMember(user, this.channel.guild);

        let player: Player;
        try {
            player = await beastiary.players.fetch(guildMember);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error fetching a player in an encounter message.

                Guild member: ${JSON.stringify(guildMember)}
                
                ${error}
            `);
        }

        if (!player.canCapture) {
            if (!this.warnedUserIds.includes(user.id)) {
                if (player.collectionAnimalIds.length >= player.collectionSizeLimit) {
                    betterSend(this.channel, `${user}, your collection is full! Either release some animals with \`${commandHandler.getPrefixByGuild(this.channel.guild)}release\`, or upgrade your collection size.`);
                }
                else {
                    betterSend(this.channel, `${user}, you can't capture an animal for another **${remainingTimeString(encounterHandler.nextCaptureReset)}**.`);
                }

                this.warnedUserIds.push(user.id);
            }
            return;
        }

        const commonName = this.species.commonNameObjects[0];

        betterSend(this.channel, `${user}, you caught ${commonName.article} ${commonName.name}!`);
        this.setDeactivationText("(caught)");

        player.captureAnimal();

        try {
            await beastiary.animals.createAnimal(guildMember, this.species, this.card);
        }
        catch (error) {
            betterSend(this.channel, "There was an error creating a new animal from an encounter, sorry if you didn't get your animal! Please report this to the developer and you can be compensated.");

            throw new Error(stripIndents`
                There was an error creating a new animal in an encounter message.

                Player: ${JSON.stringify(player)}
                Species: ${JSON.stringify(this.species)}
                Card: ${JSON.stringify(this.card)}
                
                ${error}
            `);
        }

        this.deactivate();
    }
}