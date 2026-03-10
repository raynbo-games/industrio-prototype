import ItemData from "../Item/ItemData";
import RecipeInputData from "./RecipeInputData";
import RecipeOutputData from "./RecipeOutputData";

@CreateAssetMenu("Industrio/Item/Crafting Recipe")
export default class CraftingRecipeData extends AirshipScriptableObject {
    public primaryOutput: ItemData;
    public inputs: RecipeInputData[];
    public outputs: RecipeOutputData[];
}