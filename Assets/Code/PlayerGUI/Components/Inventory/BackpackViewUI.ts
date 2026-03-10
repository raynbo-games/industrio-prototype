import InventoryManager from "Code/InventoryManager/InventoryManager";
import PlayerDataManager, { PlayerStatesClient } from "Code/PlayerDataManager/PlayerDataManager";
import InteractiveWorld from "Code/World/InteractiveWorld/InteractiveWorld";
import ItemGridViewUI from "./ItemGridViewUI";
import Item from "Code/InventoryManager/Item/Item";
import ObjectUtils from "@Easy/Core/Shared/Util/ObjectUtils";
import WorldObjectInventoryUI from "./WorldObjectInventoryUI";

@AirshipComponentMenu("UI/Backpack View")
export default class BackpackViewUI extends ItemGridViewUI {
    @SerializeField() protected moveToInventory?: WorldObjectInventoryUI;

    protected playerState: PlayerStatesClient;

    @Client()
    public Initialize(moveToInventory?: WorldObjectInventoryUI, validItemNames?: string[]): void {
        this.validItemsNames = validItemNames;
        this.moveToInventory = moveToInventory ?? this.moveToInventory;
        this.playerState = PlayerDataManager.Get().GetLocalState();
        const inventory = this.playerState.inventory.GetState();
        ObjectUtils.keys(inventory).forEach((itemName) => {
            const item = InventoryManager.Get().Items.get(itemName as string);
            if (!item) return;
            if (this.playerState.inventory.GetKey(itemName).quantity > 0) this.AddOrUpdateItem(item, inventory[itemName].quantity);
            this.bin.Add(this.playerState.inventory.ConnectKeyUpdated(itemName, (value, oldValue) => {
                const itemSlotUI = this.GetItem(itemName as string);
                if (!itemSlotUI && oldValue.quantity === 0 && value.quantity > 0) return this.AddOrUpdateItem(item, inventory[itemName].quantity);
                if (itemSlotUI && value.quantity === 0) return Destroy(itemSlotUI.gameObject);
                if (itemSlotUI && value.quantity > 0) return itemSlotUI.SetQuantity(value.quantity);
            })!);
        });
    }

    @Client()
    public AddOrUpdateItem(item: Item, quantity: number): void {
        const data = this.GetItem(item.internalName);
        if (data) return data.SetQuantityText(quantity);
        if (!this.moveToInventory) {
            this.AddItem(item, quantity);
            return;
        }
        this.AddItem(item, quantity, (itemSlotUI) => {
            if (!itemSlotUI) return;
            const state = PlayerDataManager.Get().GetLocalState().state;
            InteractiveWorld.onAddItemToObject.client.FireServer(state.GetKey("worldId"), this.moveToInventory!.objectPosition, item.internalName, itemSlotUI.GetQuantity(), this.moveToInventory?.GetLocation());
        });
    }
}