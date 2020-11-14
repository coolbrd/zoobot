import Shop from "../Shop";
import CaptureItem from "../shopItems/Capture";
import CollectionExpander from "../shopItems/CollectionExpander";
import EncounterItem from "../shopItems/Encounter";

class ItemShop extends Shop {
    public readonly items = [
        new EncounterItem(),
        new CaptureItem(),
        new CollectionExpander()
    ];
}
const itemShop = new ItemShop();
export default itemShop;