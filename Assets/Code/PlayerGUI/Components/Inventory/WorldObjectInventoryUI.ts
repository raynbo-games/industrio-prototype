import { InventoryWorldObjectData } from "Code/InventoryManager/Item/InventoryWorldObjectDataItem";
import InventoryManager from "Code/InventoryManager/InventoryManager";
import PlayerDataManager from "Code/PlayerDataManager/PlayerDataManager";
import InteractiveWorld from "Code/World/InteractiveWorld/InteractiveWorld";
import { WorldObjectPlacementData } from "Code/PlayerDataManager/PlayerSave";
import ItemGridViewUI from "./ItemGridViewUI";
import Item from "Code/InventoryManager/Item/Item";

@AirshipComponentMenu("UI/World Object Inventory")
export default class WorldObjectInventoryUI extends ItemGridViewUI {
    @NonSerialized() public objectPosition: Vector3;

    @Client()
    public Initialize(objectData: WorldObjectPlacementData, location?: string, validItemNames?: string[]): void {
        this.validItemsNames = validItemNames;
        this.objectPosition = objectData.position;
        this.location = location ?? this.location;
        this.UpdateData(objectData);
    }

    @Client()
    public AddOrUpdateSlot(objectData: WorldObjectPlacementData, item: Item, quantity: number): void {
        const data = this.GetItem(item.internalName);
        if (data) return data.SetQuantityText(quantity);
        this.AddItem(item, quantity, () => {
            const state = PlayerDataManager.Get().GetLocalState().state;
            InteractiveWorld.onTakeItemFromObject.client.FireServer(state.GetKey("worldId"), objectData.position, item.internalName, this.GetLocation());
        });
    }

    @Client()
    public UpdateData(objectData: WorldObjectPlacementData): void {
        const inventory = (objectData.data as unknown as InventoryWorldObjectData).inventory;
        const items: string[] = [];
        inventory.forEach((slotData) => {
            if (this.GetLocation() && slotData.location !== this.GetLocation()) return;
            const item = InventoryManager.Get().Items.get(slotData.itemName)!.gameObject.GetAirshipComponent<Item>()!;
            this.AddOrUpdateSlot(objectData, item, slotData.quantity);
            items.push(slotData.itemName);
        });
        this.GetAllItems().forEach((itemSlotUI) => {
            if (!items.includes(itemSlotUI.item!.internalName)) Destroy(itemSlotUI.gameObject);
        });
    }
}