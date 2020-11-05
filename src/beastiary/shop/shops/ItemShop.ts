import Shop from "../Shop";
import CaptureItem from "../shopItems/Capture";
import EncounterItem from "../shopItems/Encounter";

class ItemShop extends Shop {
    public readonly items = [
        new EncounterItem(),
        new CaptureItem()
    ];
}
const itemShop = new ItemShop();
export default itemShop;