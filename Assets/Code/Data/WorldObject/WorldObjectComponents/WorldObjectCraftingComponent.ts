import CraftingRecipeData from "Code/Data/Recipe/CraftingRecipeData";
import IWorldObjectComponent from "./WorldObjectComponent";
import { Player } from "@Easy/Core/Shared/Player/Player";
import PlayerDataManager from "Code/PlayerDataManager/PlayerDataManager";
import ItemManager from "Code/InventoryManager/ItemManager";

@CreateAssetMenu("Industrio/World Object/World Object Crafting Component")
export default class WorldObjectCraftingComponentData extends AirshipScriptableObject implements IWorldObjectComponent {
    @NonSerialized() name: string = "Crafting";
    @NonSerialized() public priority: number = 0;
    public recipes: CraftingRecipeData[];

    public CanPlayerCraftRecipe(player: Player, recipe: CraftingRecipeData, quantity: number = 1): boolean {
        const inventory = PlayerDataManager.Get().GetPlayerState(player).inventory;
        const inventoryItems = inventory.GetState();
        for (let inputIndex = 0; inputIndex < recipe.inputs.size(); inputIndex++) {
            const inputItem = recipe.inputs[inputIndex];
            const items = ItemManager.Get().GetItemsFromId(inputItem.item.identity.id);
            let success = false;
            for (let itemIndex = 0; itemIndex < items.size(); itemIndex++) {
                const item = items[itemIndex];
                if (inventoryItems[item.identity.id].quantity >= inputItem.quantity * quantity) {
                    success = true;
                    break;
                }
            }
            if (!success) return false;
        }
        return true;
    }

    public TryPlayerCraftRecipe(player: Player, recipe: CraftingRecipeData, quantity: number = 1): boolean {
        if (!this.CanPlayerCraftRecipe(player, recipe, quantity)) return false;
        const inventory = PlayerDataManager.Get().GetPlayerState(player).inventory;
        const inventoryItems = inventory.GetState();
        for (let inputIndex = 0; inputIndex < recipe.inputs.size(); inputIndex++) {
            const inputItem = recipe.inputs[inputIndex];
            const items = ItemManager.Get().GetItemsFromId(inputItem.item.identity.id);
            for (let itemIndex = 0; itemIndex < items.size(); itemIndex++) {
                const item = items[itemIndex];
                if (inventoryItems[item.identity.id].quantity >= inputItem.quantity * quantity) {
                    inventory.UpdateKey(item.identity.id, (itemData) => {
                        itemData.quantity = itemData.quantity - inputItem.quantity * quantity;
                        return itemData;
                    });
                    break;
                }
            }
        }

        for (let outputIndex = 0; outputIndex < recipe.outputs.size(); outputIndex++) {
            const outputItem = recipe.outputs[outputIndex];
            inventory.UpdateKey(outputItem.item.identity.id, (itemData) => {
                itemData.quantity = itemData.quantity + outputItem.GetQuantity();;
                return itemData;
            });
        }
        
        return true;
    }
}