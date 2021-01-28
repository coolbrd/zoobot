import Shop from "../Shop";
import CollectionExpander from "../shopItems/CollectionExpander";
import FreeEncounterMaxStackUpgrade from "../shopItems/FreeEncounterMaxStackUpgrade";
import FreeXpBoostMaxStackUpgrade from "../shopItems/FreeXpBoostMaxStackUpgrade";

class UpgradeShop extends Shop {
    public readonly items = [
        CollectionExpander,
        FreeEncounterMaxStackUpgrade,
        FreeXpBoostMaxStackUpgrade
    ];
}
export default new UpgradeShop;