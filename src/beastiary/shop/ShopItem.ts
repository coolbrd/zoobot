import { Player } from "../../structures/GameObject/GameObjects/Player";
import EmojiManager from "../EmojiManager";

export default abstract class ShopItem {
    public abstract readonly simpleNames: string[];

    public readonly canBuyMultiple: boolean = true;

    public abstract getName(player: Player): string;

    public abstract getPrice(player: Player): number;

    public abstract purchaseAction(player: Player, quantity?: number): void;

    public getPurchaseMessage(player: Player, quantity: number, price: number, emojiManager: EmojiManager): string {
        const pepEmoji = emojiManager.getByName("pep");
        return `Purchase successful. You bought **${this.getName(player)} (x${quantity})** for **${price}**${pepEmoji}.`
    }
}