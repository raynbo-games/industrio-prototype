import CraftingRecipeData from "Code/Data/Recipe/CraftingRecipeData";
import IWorldObjectComponent, { IWorldObjectComponentStatus } from "./WorldObjectComponent";
import PlayerDataManager from "Code/PlayerDataManager/PlayerDataManager";
import ItemManager from "Code/InventoryManager/ItemManager";
import ProcessingRecipeData from "Code/Data/Recipe/ProcessingRecipeData";
import { WorldObjectInstance } from "../WorldObjectInstance";
import WorldObjectInventoryComponentData, { WorldObjectInventoryInstance } from "./WorldObjectInventoryComponent";
import ItemData from "Code/Data/Item/ItemData";
import { Player } from "@Easy/Core/Shared/Player/Player";

export interface IWorldObjectProcessingComponent {
    recipe: number,
    time: number,
    status: IWorldObjectComponentStatus,
}

@CreateAssetMenu("Industrio/World Object/World Object Processing Component")
export default class WorldObjectProcessingComponentData extends AirshipScriptableObject implements IWorldObjectComponent<IWorldObjectProcessingComponent> {
    @NonSerialized() public name: string = "Processing";
    @NonSerialized() public priority: number = 0;
    public processingSpeed: number = 1;
    public inputLocation: number = 1;
    public outputLocation: number = 2;
    public recipes: ProcessingRecipeData[];

    public CanCraftRecipe(baseItem: ItemData, instance: WorldObjectInstance, recipe: CraftingRecipeData, quantity: number = 1): boolean {
        const inventory = instance.components["Inventory"] as WorldObjectInventoryInstance;
        
        for (let inputIndex = 0; inputIndex < recipe.inputs.size(); inputIndex++) {
            const inputItem = recipe.inputs[inputIndex];
            const items = ItemManager.Get().GetItemsFromId(inputItem.item.identity.id);
            let success = false;
            for (let itemIndex = 0; itemIndex < items.size(); itemIndex++) {
                const item = items[itemIndex];
                const inputItem = inventory.inventory.find((stack) => {
                    if (stack.itemId !== item.identity.id) return false;
                    if (stack.location !== this.inputLocation) return false;
                    return true; 
                });
                if (!inputItem) continue;
                if (inputItem.quantity > inputItem.quantity * quantity) success = true;
            }
            if (!success) return false;
        }

        const inventoryComponent = baseItem.worldObject!.components.find((component) => {
            if ((component as unknown as IWorldObjectComponent).name === "Inventory") {
                return true;
            }
            return false;
        }) as WorldObjectInventoryComponentData;

        for (let outputIndex = 0; outputIndex < recipe.outputs.size(); outputIndex++) {
            const outputItem = recipe.outputs[outputIndex];
            const item = inventory.inventory.find((stack) => {
                if (stack.itemId !== outputItem.item.identity.id) return false;
                if (stack.location !== this.outputLocation) return false;
                return true; 
            });
            if (!item ) continue;
            if (inventoryComponent.maxStackSize > item.quantity + math.max(math.min(...outputItem.quantities), 1)) {
                return false;
            }
        }
        return true;
    }

    public TryCraftRecipe(player: Player, baseItem: ItemData, instance: WorldObjectInstance, recipe: CraftingRecipeData, quantity: number = 1): boolean {
        if (!this.CanCraftRecipe(baseItem, instance, recipe, quantity)) return false;
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

    public SelectRecipe(baseItem: ItemData, instance: WorldObjectInstance): number {
        for (let recipeIndex = 0; recipeIndex < this.recipes.size(); recipeIndex++) {
            if (!this.CanCraftRecipe(baseItem, instance, this.recipes[recipeIndex], 1)) continue;
            return recipeIndex;
        }
        return -1;
    }

    public SetRecipe(baseItem: ItemData, instance: WorldObjectInstance, recipe: number): void {
        const componentData = instance.components["Processing"] as IWorldObjectProcessingComponent;
        componentData.recipe = recipe;
    }

    public Load(item: ItemData, data?: string): IWorldObjectProcessingComponent {
        if (!data) return {
            recipe: -1,
            time: 0,
            status: {
                enabled: true,
                working: false,
                statusText: "No recipe",
            },
        }
        const splitData = data.split(",");
        return {
            recipe: tonumber(splitData[0])!,
            time: tonumber(splitData[1])!
        }
    }

    public Unload(item: ItemData, data: IWorldObjectProcessingComponent): string {
        return `${data.recipe},${data.time}`;
    }
}