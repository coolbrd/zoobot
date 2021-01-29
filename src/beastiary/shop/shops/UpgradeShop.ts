import Shop from "../Shop";
import CollectionExpander from "../shopItems/CollectionExpander";
import FreeEncounterMaxStackUpgrade from "../shopItems/FreeEncounterMaxStackUpgrade";
import FreeXpBoostMaxStackUpgrade from "../shopItems/FreeXpBoostMaxStackUpgrade";
import WishlistSlotsUgprade from "../shopItems/WishlistSlotsUgprade";

class UpgradeShop extends Shop {
    public readonly items = [
        CollectionExpander,
        FreeEncounterMaxStackUpgrade,
        FreeXpBoostMaxStackUpgrade,
        WishlistSlotsUgprade
    ];
}
export default new UpgradeShop;