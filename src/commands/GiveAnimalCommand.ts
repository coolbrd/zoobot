import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import awaitUserNextMessage from "../discordUtility/awaitUserNextMessage";
import handleUserError from "../discordUtility/handleUserError";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";

class GiveAnimalCommand extends GuildCommand {
    public readonly names = ["giveanimal", "ga"];

    public readonly info = "Give another player one of your animals";

    public readonly helpUseString = "`<animal identifier>` `<user tag or id>` to give that animal to that user.";

    public readonly sections = [CommandSection.animalManagement];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();

        const givingPlayer = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const animalIdentifier = parsedMessage.consumeArgument().text;

        const givenAnimal = beastiaryClient.beastiary.animals.searchPlayerAnimal(animalIdentifier, givingPlayer);

        if (!givenAnimal) {
            betterSend(parsedMessage.channel, `No animal you own with the identifier '${animalIdentifier}' could be found.`);
            return commandReceipt;
        }

        let receivingPlayer: Player;
        try {
            receivingPlayer = await beastiaryClient.beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error);
            return commandReceipt;
        }

        if (receivingPlayer === givingPlayer) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        if (receivingPlayer.collectionFull) {
            betterSend(parsedMessage.channel, `${receivingPlayer.username}'s collection is full, they can't be given any animals right now.`);
            return commandReceipt;
        }

        betterSend(parsedMessage.channel, stripIndent`
            ${receivingPlayer.pingString}, ${givingPlayer.username} wants to give you ${givenAnimal.displayName}.

            Type "yes" or "y" to accept, ignore or type anything else to deny.
        `);

        if (!receivingPlayer.member) {
            throw new Error(stripIndent`
                A player with no member attempted to receive an animal.

                Player: ${receivingPlayer.debugString}
            `);
        }

        const consentMessage = await awaitUserNextMessage(parsedMessage.channel, receivingPlayer.member.user, 15000);

        let response: string | undefined;

        if (consentMessage) {
            response = consentMessage.content.toLowerCase();
        }

        if (response !== "yes" && response !== "y") {
            betterSend(parsedMessage.channel, `${receivingPlayer.username} denied the gift.`);
            return commandReceipt;
        }

        try {
            await givingPlayer.giveAnimal(givenAnimal.id, receivingPlayer);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error giving an animal from one player to another.

                ${error}
            `);
        }

        betterSend(parsedMessage.channel, `Success, ${givenAnimal.displayName} was given to ${receivingPlayer.username}.`);

        return commandReceipt;
    }
}
export default new GiveAnimalCommand();