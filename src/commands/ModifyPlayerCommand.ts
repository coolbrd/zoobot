import { stripIndent } from "common-tags";
import { chdir } from "process";
import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";

class ModifyPlayerCommand extends Command {
    public readonly names = ["modifyplayer", "modplayer", "mp"];
    
    public readonly info = "Change something about a specified player or players";

    public readonly helpUseString = "?";

    public readonly adminOnly = true;

    private getValidNumberArgument(parsedMessage: CommandParser): number | undefined {
        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, "Amount required.");
            return undefined;
        }

        const number = Number(parsedMessage.consumeArgument().text);

        if (isNaN(number)) {
            betterSend(parsedMessage.channel, "Amount invalid.");
            return undefined;
        }

        return number;
    }

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, "User id required.");
            return receipt;
        }

        const userId = parsedMessage.consumeArgument().text;

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, "Guild id required.");
            return receipt;
        }

        const guildId = parsedMessage.consumeArgument().text;

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, "Mode required.");
            return receipt;
        }

        const mode = parsedMessage.consumeArgument().text.toLowerCase();

        let players: Player[];
        try {
            players = await beastiaryClient.beastiary.players.getAllPlayersByIds({ userId: userId, guildId: guildId });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting all players based on a user and guild id.

                User id: ${userId}
                Guild id: ${guildId}
            `);
        }

        if (players.length < 1) {
            betterSend(parsedMessage.channel, "No players with that information could be found.");
            return receipt;
        }

        switch (mode) {
            case "pep": {
                const pep = this.getValidNumberArgument(parsedMessage);

                if (!pep) {
                    return receipt;
                }

                players.forEach(player => {
                    console.log(`Giving ${player.member.user.tag} in ${player.member.guild.name} ${pep} pep.`);
                    player.pep += pep;
                });

                break;
            }
            case "encounter": {
                const encounters = this.getValidNumberArgument(parsedMessage);

                if (!encounters) {
                    return receipt;
                }

                players.forEach(player => {
                    console.log(`Giving ${player.member.user.tag} in ${player.member.guild.name} ${encounters} encounters.`);
                    player.extraEncountersLeft += encounters;
                });

                break;
            }
            case "prizeball": {
                const prizeBalls = this.getValidNumberArgument(parsedMessage);

                if (!prizeBalls) {
                    return receipt;
                }

                players.forEach(player => {
                    console.log(`Giving ${player.member.user.tag} in ${player.member.guild.name} ${prizeBalls} encounters.`);
                    player.prizeBalls += prizeBalls;
                });

                break;
            }
        }

        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new ModifyPlayerCommand();