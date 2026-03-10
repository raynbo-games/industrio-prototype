import ItemData from "../Item/ItemData";
import TagData from "../Item/TagData";

@CreateAssetMenu("Industrio/Recipe/Recipe Input")
export default class RecipeInputData extends AirshipScriptableObject {
    public item: ItemData | TagData;
    public quantity: number;
}