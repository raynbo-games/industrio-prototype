import PlayerDataManager from "Code/PlayerDataManager/PlayerDataManager";
import InteractiveWorld from "Code/World/InteractiveWorld/InteractiveWorld";
import InventoryManager from "Code/InventoryManager/InventoryManager";
import WorldObjectItem from "Code/InventoryManager/Item/WorldObjectItem";
import WorldObjectViewUI from "./Components/WorldObject/WorldObjectView";
import InventoryUI from "./Components/Inventory/InventoryUI";

@AirshipComponentMenu("Singletons/Player GUI")
export default class PlayerGUI extends AirshipSingleton {
    public emptyItemSlotIcon: Sprite;
    public itemSlotPrefab: GameObject;
    public coreTransform: Transform;
    public inventoryUI: InventoryUI;
    public view?: WorldObjectViewUI | undefined;

    public IsActive(): boolean {
        if (this.inventoryUI.backpackViewUI !== undefined) return true;
        if (this.view !== undefined) return true;
        return false;
    }

    public Initialize(): void {
        this.inventoryUI.Initialize();
    }

    public OpenWorldObjectView(position: Vector3): void {
        const state = PlayerDataManager.Get().GetLocalState().state;
        const data = InteractiveWorld.onObjectViewOpened.client.FireServer(state.GetKey("worldId"), position);
        if (!data) return;
        const item = InventoryManager.Get().Items.get(data.type)!.gameObject.GetAirshipComponent<WorldObjectItem>()!
        const view = Instantiate(item.view!, this.coreTransform).GetAirshipComponent<WorldObjectViewUI>()!;
        view.Initialize(state.GetKey("worldId"), data);
        this.view = view;
    }
}