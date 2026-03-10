import ItemData from "../Item/ItemData";

@CreateAssetMenu("Industrio/Recipe/Recipe Output")
export default class RecipeOutputData extends AirshipScriptableObject {
    public item: ItemData;
    public quantities: number[];
    public weights: number[];

    private rng = new Random();

    protected Awake(): void {
        table.freeze(this.weights);
    }

    public GetQuantity(): number {
        return this.rng.PickItemWeighted(this.quantities, this.weights)[0];
    }
}