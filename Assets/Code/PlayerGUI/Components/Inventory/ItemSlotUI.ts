import Item from "Code/InventoryManager/Item/Item";
import PlayerGUI from "Code/PlayerGUI/PlayerGUI";
import ButtonUI from "./ButtonUI";

@AirshipComponentMenu("UI/Item Slot")
export default class ItemSlotUI extends ButtonUI {

    @SerializeField() protected itemQuantityText: TMP_Text;
    @SerializeField() protected itemNameText: TMP_Text;
    @SerializeField() protected icon: RawImage;

    protected selected: boolean = false;
    protected quantity: number = 0;

    public item?: Item;

    @Client()
    public SetQuantityText(quantity?: string | number): void {
        this.itemQuantityText.text = quantity ? tostring(quantity) : "";
    }

    @Client()
    public SetQuantity(quantity: number): void {
        this.SetQuantityText(quantity);
        this.quantity = quantity;
    }

    @Client()
    public GetQuantity(): number {
        return this.quantity;
    }

    @Client()
    public SetItem(item?: Item, quantity?: string | number): void {
        if (!item) return this.ClearItem();
        this.item = item;
        this.itemNameText.text = item.displayName;
        this.icon.texture = item.icon?.texture ?? PlayerGUI.Get().emptyItemSlotIcon.texture;
        if (tonumber(quantity)) this.SetQuantity(tonumber(quantity)!);
        else this.SetQuantityText(quantity);
    }

    @Client()
    public ClearItem(): void {
        this.bin.Clean();
        this.item = undefined;
        this.itemNameText.text = '';
        this.itemQuantityText.text = '';
        this.icon.texture = PlayerGUI.Get().emptyItemSlotIcon.texture;
    }

    @Client()
    public Select(): void {
        if (this.selected) return;
        const transform = this.gameObject.GetComponent<RectTransform>()!;
        transform.sizeDelta = transform.sizeDelta.add(new Vector2(10, 10));
        this.selected = true;
    }

    @Client()
    public Deselect(): void {
        if (!this.selected) return;
        const transform = this.gameObject.GetComponent<RectTransform>()!;
        transform.sizeDelta = transform.sizeDelta.sub(new Vector2(10, 10));
        this.selected = false;
    }
}