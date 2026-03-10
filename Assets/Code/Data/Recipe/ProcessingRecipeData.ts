import RecipeInputData from "./RecipeInputData";
import RecipeOutputData from "./RecipeOutputData";
import ItemData from "../Item/ItemData";

@CreateAssetMenu("Industrio/Item/Processing Recipe")
export default class ProcessingRecipeData extends AirshipScriptableObject {
    public primaryOutput: ItemData;
    public processingTime: number;
    public inputs: RecipeInputData[];
    public outputs: RecipeOutputData[];
}