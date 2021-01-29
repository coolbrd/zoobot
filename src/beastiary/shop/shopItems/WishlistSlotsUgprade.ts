import { stripIndent } from "common-tags";
import { Player } from "../../../structures/GameObject/GameObjects/Player";
import ShopItem from "../ShopItem";

export default class WishlistSlotsUpgrade extends ShopItem {
    public readonly simpleNames = ["wishlist slots", "wish slots", "wishlist size", "wish size"];

    public readonly canBuyMultiple = false;
    public readonly inline = false;

    public getName(player: Player): string {
        return `wishlist size: lvl ${player.wishlistSlotsUpgradeLevel + 1}`;
    }

    public getPrice(player: Player): number {
        return 10000 + player.wishlistSlotsUpgradeLevel * 5000;
    }

    public purchaseAction(player: Player): void {
        player.wishlistSlotsUpgradeLevel += 1;
    }

    public getPurchaseMessage(player: Player, _quantity: number, price: number): string {
        const pepEmoji = this.shop.beastiaryClient.beastiary.emojis.getByName("pep");
        return stripIndent`
            Success, your wishlist size has been increased by +**1**, and is now **${player.maxWishlistSize}**!
            -**${price}**${pepEmoji}
        `;
    }

    public getPlayerCurrentAmount(player: Player): number {
        return player.maxWishlistSize;
    }
}