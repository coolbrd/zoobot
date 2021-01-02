import { Message, TextChannel } from "discord.js";
import seedrandom from "seedrandom";
import BeastiaryClient from "../bot/BeastiaryClient";
import gameConfig from "../config/gameConfig";
import { betterSend } from "../discordUtility/messageMan";
import TimedMessageCollector from "../discordUtility/TimedMessageCollector";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { randomWithinRange } from "../utility/numericalMisc";
import { getDaysSinceEpoch } from "../utility/timeStuff";

class FishCommand extends GuildCommand {
    public readonly names = ["fish", "cast"];

    public readonly info = "Cast your line and fish up some pep, eventualy";

    public readonly helpUseString = "`<distance>` to throw out your line and wait for some pep to bite. It might take a while. Type 'reel' once you have a bite.";

    public readonly sections = [CommandSection.gettingStarted, CommandSection.gameplay];

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "distance",
            info: "The distance, between 1 and 100 feet, you want to cast.",
            optional: true,
            default: "a random distance"
        }
    ];

    private fishingPlayers = new Map<string, TextChannel>();

    private reelWindow = 10 * 1000;

    private distanceBounds = {
        min: 1,
        max: 100
    };

    private fishingTimeBounds = {
        min: 5,
        max: 15
    };

    private extraTimeBounds = {
        min: 0,
        max: 5
    };

    private setPlayerFishing(player: Player, channel: TextChannel): void {
        this.fishingPlayers.set(player.id.toHexString(), channel);
    }

    private unsetPlayerFishing(player: Player): void {
        this.fishingPlayers.delete(player.id.toHexString());
    }

    private playerIsFishing(player: Player): boolean {
        return Boolean(this.fishingPlayers.get(player.id.toHexString()));
    }

    private isReelMessage(message: Message): boolean {
        return message.content.toLowerCase().startsWith("reel");
    }

    private getSweetSpotDistance(channel: TextChannel): number {
        const channelIdNumber = Number(channel.id);
        const sweetSpotSeed = getDaysSinceEpoch() + channelIdNumber;
        const seededRandom = seedrandom(sweetSpotSeed.toString());
        const primeFishingDistance = randomWithinRange(seededRandom(), this.distanceBounds.min, this.distanceBounds.max);

        return primeFishingDistance;
    }

    private getFishingTime(distanceToSweetSpot: number): number {
        const maxFishingTimeOffset = 1 / (Math.pow(distanceToSweetSpot / 25, 2) + (1 / 10));
        const baseFishingTime = this.fishingTimeBounds.max - maxFishingTimeOffset;
        const offsetFromBase = randomWithinRange(Math.random(), this.extraTimeBounds.min, this.extraTimeBounds.max);
        const fishingTime = (baseFishingTime + offsetFromBase) * 1000 * 60;

        return fishingTime;
    }

    private calculateFishingTime(channel: TextChannel, distance: number): number {
        const sweetSpot = this.getSweetSpotDistance(channel);

        const distanceToSweetSpot = Math.abs(sweetSpot - distance);
        
        const fishingTime = this.getFishingTime(distanceToSweetSpot);

        return fishingTime;
    }

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        let player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const fishingChannel = this.playerIsFishing(player);
        if (fishingChannel) {
            betterSend(parsedMessage.channel, `You're already fishing in ${fishingChannel}, reel in your line before trying to cast again!`);
            return commandReceipt;
        }

        let distance: number;
        if (parsedMessage.currentArgument) {
            const inputDistanceString = parsedMessage.consumeArgument().text;

            const inputDistance = Number(inputDistanceString);

            if (isNaN(inputDistance)) {
                betterSend(parsedMessage.channel, `You must enter a numerical distance to cast. '${inputDistanceString}' is invalid.`);
                return commandReceipt;
            }

            if (inputDistance < this.distanceBounds.min || inputDistance > this.distanceBounds.max) {
                betterSend(parsedMessage.channel, `Your cast distance must be between ${this.distanceBounds.min} and ${this.distanceBounds.max} feet.`);
                return commandReceipt;
            }

            distance = inputDistance;
        }
        else {
            distance = Math.floor(randomWithinRange(Math.random(), this.distanceBounds.min, this.distanceBounds.max));
        }

        betterSend(parsedMessage.channel, `You cast your line ${distance} feet out.`);
        this.setPlayerFishing(player, parsedMessage.channel);

        const fishingTime = this.calculateFishingTime(parsedMessage.channel, distance);

        const messageCollector = new TimedMessageCollector();
        const earlyReelMessage = await messageCollector
            .collectIn(parsedMessage.channel)
            .collectFrom(player.member.user)
            .collectBy(this.isReelMessage)
            .collectOne(fishingTime);

        player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        if (earlyReelMessage) {
            betterSend(parsedMessage.channel, "You reel your line back in.");
        }
        else {
            betterSend(parsedMessage.channel, `${player.member.user}, you've got a bite!`);

            const reelMessage = await messageCollector.collectOne(this.reelWindow);

            if (reelMessage) {
                const rewardPep = Math.floor(Math.random() * 15) + 5;

                player.pep += rewardPep;

                const pepEmoji = beastiaryClient.beastiary.emojis.getByName("pep");
                betterSend(parsedMessage.channel, `Success, you reeled in ${rewardPep}${pepEmoji}`);

                player.awardCrewExperienceInChannel(gameConfig.xpPerFish, parsedMessage.channel);
            }
            else {
                betterSend(parsedMessage.channel, "It got away.");
            }
        }

        this.unsetPlayerFishing(player);
        return commandReceipt;
    }
}
export default new FishCommand();