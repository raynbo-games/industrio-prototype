import WorldObjectItem from "Code/InventoryManager/Item/WorldObjectItem";
import WorldManager from "./WorldManager";
import { WorldType } from "./World";
import { Game } from "@Easy/Core/Shared/Game";
import PlayerWorld from "./PlayerWorld/PlayerWorld";
import { RaycastData } from "Code/InventoryManager/Item/UseableItem";

export class PlacementGhost {
    public object: GameObject;
    public item: WorldObjectItem;
    public world: PlayerWorld;
    public selectors: GameObject[] = [];
    public lastData?: RaycastData;
    public static ghost?: PlacementGhost;

    public SetObjectAsGhost(obj: GameObject): void {
        const renderer = obj.GetComponent<Renderer>();
        if (renderer) {
            renderer.material = WorldManager.Get().ghostMaterial;
        }
        const collider = obj.GetComponent<Collider>();
        if (collider) Destroy(collider);
        for (let i = 0; i < obj.transform.childCount; i++) {
            this.SetObjectAsGhost(obj.transform.GetChild(i).gameObject);
        }
    }

    public CreateSelector(position: Vector3, color: "White" | "Red" | "Yellow"): void {
        const selector = Instantiate(WorldManager.Get().selectionObject, this.world.gameObject.transform);
        if (color !== "White") {
            const renderer = selector.GetComponent<Renderer>()!;
            if (color === "Red") renderer.material = WorldManager.Get().redSelectionMaterial;
            if (color === "Yellow") renderer.material = WorldManager.Get().yellowSelectionMaterial;
        }
        selector.transform.position = position;
        this.selectors.push(selector);
    }

    public Update(): void {
        if (this.object.IsDestroyed()) return;
        const world = WorldManager.Get().GetPlayerActiveWorldComponent(WorldType.InteractiveWorld, Game.localPlayer);
        this.selectors.forEach((obj) => Destroy(obj));
        this.selectors.clear();
        const data = this.world.RaycastBlock("Place");
        if (data === this.lastData) return;
        this.lastData = data;
        if (!data) return this.object.SetActive(false);
        const objectSave = this.world.CreateObjectSave(this.item, data.position, data.rotation, data.normal);
        this.object.transform.position = objectSave.position;
        this.object.transform.rotation = this.world.GetObjectRotation(objectSave.normal, objectSave.rotation);
        this.object.SetActive(true);
        const collisions = world.GetCollisions(objectSave);
        collisions.forEach((position) => {
            this.CreateSelector(position, "Red");
        });
        if (this.item.requireSupport) {
            const missingSupports = world.GetMissingFloor(objectSave);
            missingSupports.forEach((position) => {
                this.CreateSelector(position, "Yellow");
            });
        }
    }

    public Destroy(): void {
        Destroy(this.object);
        this.selectors.forEach((selector) => Destroy(selector));
        PlacementGhost.ghost = undefined;
    }

    public constructor(world: PlayerWorld, item: WorldObjectItem) {
        this.item = item;
        this.world = world;
        this.object = Instantiate(item.prefab, WorldManager.Get().gameObject.transform);
        this.object.SetActive(false);
        this.object.name = `${item.displayName} (Ghost)`;
        this.SetObjectAsGhost(this.object);
    }

    public static Create(item: WorldObjectItem): PlacementGhost | undefined {
        const world = WorldManager.Get().TryGetPlayerActiveWorldComponent(WorldType.PlayerWorld, Game.localPlayer);
        if (!world) return;
        if (!world.IsAuthorized(Game.localPlayer)) return;
        this.ghost = new PlacementGhost(world, item);
        return this.ghost;
    }
}