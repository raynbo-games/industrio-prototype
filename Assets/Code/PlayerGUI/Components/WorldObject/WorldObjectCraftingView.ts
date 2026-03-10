import { WorldObjectPlacementData } from "Code/PlayerDataManager/PlayerSave"
import WorldObjectViewUI from "./WorldObjectView";
import InventoryManager from "Code/InventoryManager/InventoryManager";
import StringUtils from "@Easy/Core/Shared/Types/StringUtil";
import CraftingWorldObjectItem from "Code/InventoryManager/Item/CraftingWorldObjectDataItem";
import ItemGridViewUI from "../Inventory/ItemGridViewUI";
import Recipe from "Code/InventoryManager/Recipes/Recipe";
import PlayerGUI from "Code/PlayerGUI/PlayerGUI";


@AirshipComponentMenu("UI/World Object Crafting View")
export default class WorldObjectCraftingViewUI extends WorldObjectViewUI {
    public recipeSelection: ItemGridViewUI;
    public recipeNameText: TMP_Text;
    public recipeIconImage: RawImage;
    public recipeInputList: ItemGridViewUI;
    public recipeOutputList: ItemGridViewUI;

    public craftQuantityInput: TMP_InputField;
    public craftQuantityAdd: Button;
    public craftQuantitySub: Button;
    public craftButton: Button;

    @NonSerialized()
    public objectItem: CraftingWorldObjectItem;
    @NonSerialized()
    public recipe: Recipe;
    @NonSerialized()
    public craftQuantity = 1;
    @NonSerialized()
    public recipeIndex = -1;
    @NonSerialized()
    public objectItemName: string;

    public Initialize(worldId: number, objectData: WorldObjectPlacementData): void {
        this.objectItemName = objectData.type;
        super.Initialize(worldId, objectData);
        this.worldObjectComponentNameText.text = StringUtils.ncifyVariableName(this.gameObject.name.split("(Clone)").join(""));
        this.objectItem = InventoryManager.Get().Items.get(objectData.type)!.gameObject.GetAirshipComponent<CraftingWorldObjectItem>()!;
        if (!this.objectItem) return;
        if (this.objectItem.recipes.isEmpty()) return;
        this.objectItem.recipes.forEach((recipe, index) => {
            this.recipeSelection.AddItem(recipe.GetPrimaryItem(), "", () => {
                this.SetRecipe(recipe, index);
            });
        });
        this.SetRecipe(this.objectItem.recipes[0], 0);

        this.bin.Add(this.craftQuantityInput.onValueChanged.Connect((value) => {
            const num = tonumber(value);
            if (!num) return true;
            this.craftQuantity = num;
            this.SetItems();
        }));

        this.bin.Add(this.craftQuantityAdd.onClick.Connect(() => {
            this.craftQuantity += 1;
            this.craftQuantityInput.text = `${this.craftQuantity}`;
        }));

        this.bin.Add(this.craftQuantitySub.onClick.Connect(() => {
            this.craftQuantity -= 1;
            this.craftQuantityInput.text = `${this.craftQuantity}`;
        }));

        this.bin.Add(this.craftButton.onClick.Connect(() => {
            InventoryManager.Get().onPlayerCraftItem.client.FireServer(this.objectItemName, this.recipeIndex, this.craftQuantity);
        }));
    }

    public SetRecipe(recipe: Recipe, index: number): void {
        this.recipe = recipe;
        this.recipeIndex = index;
        this.craftQuantity = 1;
        this.craftQuantityInput.text = `${this.craftQuantity}`;
        const primaryItem = recipe.GetPrimaryItem();
        this.recipeNameText.text = primaryItem.displayName;
        if (primaryItem.icon) this.recipeIconImage.texture = primaryItem.icon.texture;
        else this.recipeIconImage.texture = PlayerGUI.Get().emptyItemSlotIcon.texture;
        this.SetItems();
    }

    public SetItems(): void {
        this.recipeInputList.ClearItems();
        this.recipe.inputItems.forEach((inputItem) => {
            const quantity = inputItem.GetQuantity() * this.craftQuantity;
            this.recipeInputList.AddItem(inputItem.validItems[0], `${quantity}`);
        });
        this.recipeOutputList.ClearItems();
        this.recipe.outputItems.forEach((outputItem) => {
            const minimumQuantity = math.min(...outputItem.quantities) * this.craftQuantity;
            const maximumQuantity = math.max(...outputItem.quantities) * this.craftQuantity;
            let quantityText: string;
            if (minimumQuantity === maximumQuantity) quantityText = `${minimumQuantity}`;
            else quantityText = `${minimumQuantity} - ${maximumQuantity}`;
            this.recipeOutputList.AddItem(outputItem.validItems[0], quantityText);
        });
    }

    public OnObjectDataUpdate(): void {}
}