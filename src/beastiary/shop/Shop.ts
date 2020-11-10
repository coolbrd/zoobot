import { stripIndents } from "common-tags";
import { Player } from "../../models/Player";
import UserError from "../../structures/UserError";
import ShopItem from "./ShopItem";

export interface ShopReceipt {
    itemName: string,
    quantity: number,
    nameAndQuantity: string,
    totalPrice: number
}

export default abstract class Shop {
    protected abstract readonly items: ShopItem[];

    public attemptToPurchase(itemIndex: number, player: Player, quantity = 1): ShopReceipt {
        if (itemIndex < 0 || itemIndex >= this.items.length) {
            throw new UserError(`Invalid item number. This shop only has items from \`1\` to \`${this.items.length}\`.`);
        }

        const selectedItem = this.items[itemIndex];

        const itemName = selectedItem.getName(player);
        const itemPrice = selectedItem.getPrice(player);

        const totalPrice = itemPrice * quantity;

        const itemNameAndQuantity = `${itemName} (x${quantity})`;

        if (totalPrice > player.scraps) {
            throw new UserError(stripIndents`
                You don't have enough scraps to buy **${itemNameAndQuantity}**.
                Cost: **${totalPrice}** scraps. You have: **${player.scraps}** scraps.
            `);
        }

        player.scraps -= totalPrice;

        selectedItem.purchaseAction(player, quantity);

        const purchaseReceipt: ShopReceipt = {
            itemName: itemName,
            quantity: quantity,
            nameAndQuantity: itemNameAndQuantity,
            totalPrice: totalPrice
        };

        return purchaseReceipt;
    }
}