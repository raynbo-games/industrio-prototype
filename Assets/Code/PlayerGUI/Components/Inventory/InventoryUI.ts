import InventoryManager from "Code/InventoryManager/InventoryManager";
import ToolbarUI from "./ToolbarUI";
import ItemSlotUI from "./ItemSlotUI";
import PlayerDataManager, { PlayerStatesClient } from "Code/PlayerDataManager/PlayerDataManager";
import ObjectUtils from "@Easy/Core/Shared/Util/ObjectUtils";
import { Mouse } from "@Easy/Core/Shared/UserInput";
import Item from "Code/InventoryManager/Item/Item";
import HoldableItem from "Code/InventoryManager/Item/HoldableItem";
import { Game } from "@Easy/Core/Shared/Game";
import PlayerGUI from "Code/PlayerGUI/PlayerGUI";
import BackpackViewUI from "./BackpackViewUI";

@AirshipComponentMenu("UI/Inventory View")
export default class InventoryUI extends AirshipBehaviour {
    public content: Transform;
    public backpackPrefab: GameObject;
    public toolbarUI: ToolbarUI;

    @NonSerialized() public backpackViewUI?: BackpackViewUI;

    private playerState: PlayerStatesClient;

    @Client()
    public Initialize(): void {
        if ($SERVER) return;
        this.playerState = PlayerDataManager.Get().GetLocalState();
        for (let slotNumber = 0; slotNumber < this.toolbarUI.slots.size(); slotNumber++) {
            const itemSlot = this.toolbarUI.slots[slotNumber];
            itemSlot.ConnectClick(() => {
                if (this.backpackViewUI) {
                    this.MoveItemOffToolbar(itemSlot);
                } else {
                    this.EquipToolbarSlot(itemSlot.item?.internalName);
                }
            });
        };

        const inventory = this.playerState.inventory.GetState();
        ObjectUtils.keys(inventory).forEach((itemName) => {
            if (inventory[itemName].slot === -1) return;
            const item = InventoryManager.Get().Items.get(itemName as string);
            if (!item) return;
            this.SetToolbarSlot(inventory[itemName].slot, item);
        });
    }

    @Client()
    public ToggleBackpack(): void {
        if (this.backpackViewUI) this.CloseBackpack();
        else {
            if (PlayerGUI.Get().IsActive()) return;
            this.OpenBackpack();
        }
    }

    @Client()
    public OpenBackpack(): void {
        if (this.backpackViewUI) return;
        this.backpackViewUI = Instantiate(this.backpackPrefab, this.content).GetAirshipComponent<BackpackViewUI>();
        this.backpackViewUI!.bin.Add(Mouse.AddUnlocker());
        const inventory = this.playerState.inventory.GetState();
        ObjectUtils.keys(inventory).forEach((itemName) => {
            const itemData = inventory[itemName];
            if (itemData.quantity === 0) return;
            if (itemData.slot !== -1) return;
            this.AddItemToBackpack(itemName as string);
        });
    }

    @Client()
    public CloseBackpack(): void {
        if (!this.backpackViewUI) return;
        Destroy(this.backpackViewUI.gameObject);
        this.backpackViewUI = undefined;
    }

    @Client()
    public IsSlotOnToolbar(slot: number): boolean {
        return slot >= 0 && slot < this.toolbarUI.slots.size()
    }

    @Client()
    public MoveItemToToolbar(itemSlotUI: ItemSlotUI, slot: number): void {
        this.SetToolbarSlot(slot, itemSlotUI.item);
        Destroy(itemSlotUI.gameObject);
        InventoryManager.Get().onClientEditSlotsNetSignal.client.FireServer(itemSlotUI.item!.internalName, slot);
    }

    @Client()
    public SetToolbarSlot(slotNumber: number, item?: Item): void {
        const slot = this.toolbarUI.slots[slotNumber];
        if (!item) return this.MoveItemOffToolbar(slot);
        slot.SetItem(item, this.playerState.inventory.GetKey(item.internalName).quantity);

        const conn = this.playerState.inventory.ConnectKeyUpdated(item.internalName, (value, oldValue) => {
            if (value.quantity !== oldValue.quantity) slot.SetQuantity(value.quantity);
            if (value.quantity !== 0) return;
            this.MoveItemOffToolbar(slot);
            conn?.();
        });
    }

    @Client()
    public MoveItemOffToolbar(itemSlotUI: ItemSlotUI): void {
        const itemName = itemSlotUI.item?.internalName;
        if (!itemName) return;
        InventoryManager.Get().onClientEditSlotsNetSignal.client.FireServer(itemName, -1);
        itemSlotUI.ClearItem();
        const equippedItem = this.playerState.state.GetKey("equippedItem");
        if (equippedItem === itemName) {
            const lastSlotNumber = this.playerState.inventory.GetKey(equippedItem).slot;
            if (lastSlotNumber !== -1) this.toolbarUI.slots[lastSlotNumber].Deselect();
            const holdableItem = InventoryManager.Get().Items.get(equippedItem)?.gameObject.GetAirshipComponent<HoldableItem>();
            holdableItem?.Unequip(Game.localPlayer);
        }
        this.AddItemToBackpack(itemName);
    }

    @Client()
    public AddItemToBackpack(itemName: string): void {
        if (!this.backpackViewUI) return;
        const item = InventoryManager.Get().Items.get(itemName);
        if (!item) return;
        const itemData = this.playerState.inventory.GetKey(itemName);
        if (itemData.quantity === 0) return;

        const itemSlotUI = this.backpackViewUI.AddItem(item, itemData.quantity, () => {
            let targetSlotNumber = -1;
            for (let slotNumber = 0; slotNumber < this.toolbarUI.slots.size(); slotNumber++) {
                if (this.toolbarUI.slots[slotNumber].item) continue;
                targetSlotNumber = slotNumber;
                break;
            }
            if (targetSlotNumber === -1) {
                targetSlotNumber = 0;
                this.MoveItemOffToolbar(this.toolbarUI.slots[targetSlotNumber]);
            }
            this.MoveItemToToolbar(itemSlotUI, targetSlotNumber);
        })!; 

        itemSlotUI.SetItem(item, itemData.quantity);

        itemSlotUI.bin.Add(this.playerState.inventory.ConnectKeyUpdated(itemName, (value) => {
            if (value.quantity === 0 || value.slot !== -1) Destroy(itemSlotUI.gameObject);
            itemSlotUI.SetQuantity(value.quantity);
        })!);
    }

    @Client()
    public EquipToolbarSlot(itemName?: string): void {
        const equippedItem = this.playerState.state.GetKey("equippedItem");
        if (equippedItem !== "") {
            const lastSlotNumber = this.playerState.inventory.GetKey(equippedItem).slot;
            if (lastSlotNumber !== -1) this.toolbarUI.slots[lastSlotNumber].Deselect();
            const holdableItem = InventoryManager.Get().Items.get(equippedItem)?.gameObject.GetAirshipComponent<HoldableItem>();
            holdableItem?.Unequip(Game.localPlayer);
        }
        if (equippedItem === itemName) return;
        if (!itemName) return;
        const slotNumber = this.playerState.inventory.GetKey(itemName).slot;
        const holdableItem = InventoryManager.Get().Items.get(itemName)?.gameObject.GetAirshipComponent<HoldableItem>();
        holdableItem?.Equip(Game.localPlayer);
        if (slotNumber !== -1) this.toolbarUI.slots[slotNumber].Select();
    }

    @Client()
    public EquipToolbarSlotByNumber(slotNumber: number): void {
        if (slotNumber >= this.toolbarUI.slots.size()) return;
        const item = this.toolbarUI.slots[slotNumber].item;
        if (!item) return this.EquipToolbarSlot();
        this.EquipToolbarSlot(item.internalName);
    }
}