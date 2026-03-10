import ItemData from "Code/Data/Item/ItemData";
import IWorldObjectComponent from "./WorldObjectComponent";
import { Player } from "@Easy/Core/Shared/Player/Player";
import PlayerDataManager from "Code/PlayerDataManager/PlayerDataManager";
import { WorldObjectInstance } from "../WorldObjectInstance";
import Logger from "Code/Logger";

export interface WorldObjectInventoryStackInstance {
    itemId: number;
    quantity: number;
    slot?: number;
    location?: number
}

export interface WorldObjectInventoryInstance {
    inventory: WorldObjectInventoryStackInstance[];
}

@CreateAssetMenu("Industrio/World Object/World Object Crafting Component")
export default class WorldObjectInventoryComponentData extends AirshipScriptableObject implements IWorldObjectComponent<WorldObjectInventoryInstance> {
    @NonSerialized() name: string = "Inventory";
    @NonSerialized() public priority: number = 1000;
    public maxStackSize: number;
    public maxStacksPerLocation: number;
    
    public Load(item: ItemData, data: string): WorldObjectInventoryInstance {
        const inventory: WorldObjectInventoryInstance["inventory"] = [];
        const stackSaves = data.split(";");
        stackSaves.forEach((stackSave) => {
            const stackSaveSplit = stackSave.split(":");
            const stack: WorldObjectInventoryStackInstance = {
                itemId: tonumber(stackSaveSplit[0])!,
                quantity: tonumber(stackSaveSplit[1])!,
            };
            if (tonumber(stackSaveSplit[2])) stack.slot = tonumber(stackSaveSplit[2]);
            if (tonumber(stackSaveSplit[3])) stack.slot = tonumber(stackSaveSplit[3]);
            inventory.push(stack);
        });
        return {
            inventory: inventory,
        }
    }

    public Unload(item: ItemData, data: WorldObjectInventoryInstance): string {
        const stackSaves: string[] = [];
        data.inventory.forEach((stack) => {
            stackSaves.push(`${stack.itemId}:${stack.quantity}:${stack.slot ?? "_"}:${stack.location ?? "?"}`)
        });
        return stackSaves.join(";");
    }

    public OnDestroyed(item: ItemData, data: WorldObjectInventoryInstance, player?: Player): void {
        if (!player) return;
        const inventory = PlayerDataManager.Get().GetPlayerState(player).inventory;
        data.inventory.forEach((stack) => {
            inventory.UpdateKey(stack.itemId, (value) => {
                value.quantity = value.quantity + stack.quantity;
                return value;
            })
        });
    }

    public AddItem(data: WorldObjectInstance, itemId: number, quantity: number, location?: number, slot?: number): void {
        const inventory = data.components["Inventory"] as WorldObjectInventoryInstance;
        const existingStack = inventory.inventory.find((instance) => {
            if (instance.itemId != itemId) return false;
            if (instance.location != (location ?? -1)) return false;
            return true;
        });
        if (!existingStack) {
            const stack: WorldObjectInventoryStackInstance = {
                itemId: itemId,
                quantity: quantity,
            }
            if (slot) stack.slot = slot;
            if (location) stack.location = location;
            inventory.inventory.push(stack);
        } else {
            existingStack.quantity = existingStack.quantity + quantity;
        }
    }

    public CanAddItem(data: WorldObjectInstance, itemId: number, quantity: number, location?: number): boolean {
        const inventory = data.components["Inventory"] as WorldObjectInventoryInstance;
        const existingStack = inventory.inventory.find((instance) => {
            if (instance.itemId != itemId) return false;
            if (instance.location != (location ?? -1)) return false;
            return true;
        });
        if (existingStack) {
            if (existingStack.quantity + quantity > this.maxStackSize) return false;
        }
        return true;
    }

    public TakeItem(data: WorldObjectInstance, itemId: number, quantity: number, location?: number): void {
        const inventory = data.components["Inventory"] as WorldObjectInventoryInstance;
        const existingStack = inventory.inventory.find((instance) => {
            if (instance.itemId != itemId) return false;
            if (instance.location != (location ?? -1)) return false;
            return true;
        });
        if (!existingStack) {
            Logger.Get().Warn("Could not take item from inventory (no stack)")
        } else {
            existingStack.quantity = existingStack.quantity - quantity;
        }
    }
}