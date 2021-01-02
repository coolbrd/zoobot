import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import awaitUserNextMessage from "../discordUtility/awaitUserNextMessage";
import handleUserError from "../discordUtility/handleUserError";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";

class TradeCommand extends GuildCommand {
    public readonly names = ["trade"];

    public readonly info = "Initiate a trade with another player";

    public readonly helpUseString = "`<animal identifier>` `<user tag or id>` to start a trade with that animal and that user.";

    public readonly sections = [CommandSection.animalManagement];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();

        const initiatingPlayer = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const initiatingAnimalIdentifier = parsedMessage.consumeArgument().text;

        const initiatingAnimal = beastiaryClient.beastiary.animals.searchPlayerAnimal(initiatingAnimalIdentifier, initiatingPlayer);

        if (!initiatingAnimal) {
            betterSend(parsedMessage.channel, `No animal you own with the identifier '${initiatingAnimalIdentifier}' could be found.`);
            return commandReceipt;
        }

        let targetPlayer: Player;
        try {
            targetPlayer = await beastiaryClient.beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error);
            return commandReceipt;
        }

        if (targetPlayer === initiatingPlayer) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        betterSend(parsedMessage.channel, stripIndent`
            ${targetPlayer.member.user}, ${initiatingPlayer.member.user.username} wants to trade you ${initiatingAnimal.displayName}.

            Type the identifier of the animal you'd like to trade to them, or type "deny" to cancel the trade.
        `);

        const responseMessage = await awaitUserNextMessage(parsedMessage.channel, targetPlayer.member.user, 15000);

        let response: string | undefined = undefined;

        if (responseMessage) {
            response = responseMessage.content.toLowerCase();
        }

        if (!response || response === "deny") {
            betterSend(parsedMessage.channel, `${targetPlayer.member.user.username} denied the trade.`);
            return commandReceipt;
        }

        const offerAnimal = beastiaryClient.beastiary.animals.searchPlayerAnimal(response, targetPlayer);

        if (!offerAnimal) {
            betterSend(parsedMessage.channel, `No animal you own with the identifier '${response}' could be found.`);
            return commandReceipt;
        }

        betterSend(parsedMessage.channel, stripIndent`
            ${initiatingPlayer.member.user}, ${targetPlayer.member.user.username} has offered ${offerAnimal.displayName} for your ${initiatingAnimal.displayName}.

            Type "yes" to accept this offer, ignore this or type anything else to deny it.
        `);

        const finalConfirmation = await awaitUserNextMessage(parsedMessage.channel, initiatingPlayer.member.user, 15000);

        let finalResponse: string | undefined = undefined;

        if (finalConfirmation) {
            finalResponse = finalConfirmation.content.toLowerCase();
        }

        if (!finalResponse || finalResponse !== "yes") {
            betterSend(parsedMessage.channel, `${initiatingPlayer.member.user.username} denied the trade.`);
            return commandReceipt;
        }

        try {
            await initiatingPlayer.giveAnimal(initiatingAnimal.id, targetPlayer);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error giving a traded animal from the initiating player to the target player.

                Animal: ${initiatingAnimal.debugString}
                Initiating player: ${initiatingPlayer.debugString}
                Target player: ${targetPlayer.debugString}

                ${error}
            `);
        }

        try {
            await targetPlayer.giveAnimal(offerAnimal.id, initiatingPlayer);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error giving a traded animal from the target player to the initiating player.

                Animal: ${offerAnimal.debugString}
                Target player: ${targetPlayer.debugString}
                Initiating player: ${initiatingPlayer.debugString}

                ${error}
            `);
        }

        betterSend(parsedMessage.channel, `Success, ${initiatingAnimal.displayName} was traded for ${offerAnimal.displayName}.`);

        return commandReceipt;
    }
}
export default new TradeCommand();