import { Bin } from "@Easy/Core/Shared/Util/Bin";
import ItemSlotUI from "./ItemSlotUI";
import Item from "Code/InventoryManager/Item/Item";
import PlayerGUI from "Code/PlayerGUI/PlayerGUI";

@AirshipComponentMenu("UI/Item Grid View")
export default class ItemGridViewUI extends AirshipBehaviour {
    @SerializeField() protected container: Transform;
    @SerializeField() protected location: string = '';
    public validItemsNames?: string[];

    public bin = new Bin();

    @Client()
    public GetLocation(): string | undefined {
        return this.location !== '' ? this.location : undefined;
    }

    @Client()
    public AddItem(item: Item, quantity: string | number, onClick?: (itemSlotUI: ItemSlotUI) => void): ItemSlotUI | undefined {
        if (this.validItemsNames && !this.validItemsNames.includes(item.internalName)) return;
        const slot = Instantiate(PlayerGUI.Get().itemSlotPrefab, this.container).GetAirshipComponent<ItemSlotUI>()!;
        slot.SetItem(item, quantity);
        if (onClick) this.bin.Add(slot.ConnectClick(() => onClick(slot)));
        return slot;
    }

    @Client()
    public GetItem(itemName: string): ItemSlotUI | undefined {
        let data: ItemSlotUI | undefined;
        for (let i = 0; i < this.container.transform.childCount; i++) {
            const component = this.container.GetChild(i).gameObject.GetAirshipComponent<ItemSlotUI>()!;
            if (component.item?.internalName !== itemName) continue;
            data = component;
            break;
        }
        return data;
    }

    @Client()
    public GetAllItems(): ItemSlotUI[] {
        const data: ItemSlotUI[] = [];
        for (let i = 0; i < this.container.transform.childCount; i++) {
            const component = this.container.GetChild(i).gameObject.GetAirshipComponent<ItemSlotUI>()!;
            data.push(component);
        }
        return data;
    }

    @Client()
    public ClearItems() {
        this.bin.Clean();
        for (let i = 0; i < this.container.childCount; i++) {
            Destroy(this.container.GetChild(i).gameObject);
        }
    }

    protected OnDestroy(): void {
        this.bin.Clean();
    }
}