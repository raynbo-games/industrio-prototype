import DataContainer from "Code/Data/DataContainer";
import ItemData from "Code/Data/Item/ItemData";
import TagData from "Code/Data/Item/TagData";
import { IUseableItem } from "Code/Data/IUseableItem";
import MiningToolData from "Code/Data/Tool/MiningToolData";
import WorldObjectData from "Code/Data/WorldObject/WorldObjectData";

@AirshipComponentMenu("Singletons/Item Manager")
export default class ItemManager extends AirshipSingleton {
    public data: DataContainer;

    private items: { [id: number]: ItemData }
    private tags: { [id: number]: TagData }

    protected Initialize(): void {
        this.data.tags.forEach((tag) => {
            this.tags[tag.identity.id] = tag;
        });

        this.data.items.forEach((item) => {
            if (item.miningTool) item.miningTool.Initialize(item);
            if (item.worldObject) item.worldObject.Initialize(item);
            this.items[item.identity.id] = item;

            item.tags.forEach((tag) => {
                if (!tag.items.includes(item)) tag.items.push(item);
            });
        });
    }

    public GetItem(id: number): ItemData {
        return this.items[id];
    }

    public TryGetItem(id: number): ItemData | undefined {
        if (!(id in this.items)) return;
        return this.items[id];
    }

    public GetTag(id: number): TagData {
        return this.tags[id];
    }

    public TryGetTag(id: number): TagData | undefined {
        if (!(id in this.tags)) return;
        return this.tags[id];
    }

    public GetWorldObject(id: number): WorldObjectData {
        return this.items[id].worldObject!;
    }

    public TryGetWorldObject(id: number): WorldObjectData | undefined {
        if (!(id in this.items)) return;
        return this.items[id].worldObject;
    }

    public GetMiningTool(id: number): MiningToolData {
        return this.items[id].miningTool!;
    }

    public TryGetMiningTool(id: number): MiningToolData | undefined {
        if (!(id in this.items)) return;
        return this.items[id].miningTool;
    }

    public GetUseableItem(id: number): IUseableItem | undefined {
        if (!(id in this.items)) return;
        const miningTool = this.TryGetMiningTool(id);
        if (miningTool) return miningTool;
        const worldObject = this.TryGetWorldObject(id);
        if (worldObject) return worldObject;
    }

    public GetItemsFromId(id: number): ItemData[] {
        const tag = this.TryGetTag(id);
        if (tag) return tag.items;
        const item = this.TryGetItem(id);
        if (item) return [item];
        return [];
    }
}