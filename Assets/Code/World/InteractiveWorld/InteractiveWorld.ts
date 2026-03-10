import { Player } from "@Easy/Core/Shared/Player/Player";
import World from "../World";
import Logger from "Code/Logger";
import InventoryManager from "Code/InventoryManager/InventoryManager";
import { Airship } from "@Easy/Core/Shared/Airship";
import { MathUtil } from "@Easy/Core/Shared/Util/MathUtil";
import SettingsManager from "Code/SettingsManager";
import WorldObjectItem from "Code/InventoryManager/Item/WorldObjectItem";
import { WorldObjectPlacementData, WorldSave } from "Code/PlayerDataManager/PlayerSave";
import { Layer } from "@Easy/Core/Shared/Util/Layer";
import WorldObjectDataItem from "Code/InventoryManager/Item/WorldObjectDataItem";
import { NetworkSignal } from "@Easy/Core/Shared/Network/NetworkSignal";
import { NetworkFunction } from "@Easy/Core/Shared/Network/NetworkFunction";
import InventoryWorldObjectDataItem from "Code/InventoryManager/Item/InventoryWorldObjectDataItem";
import { GetWorldObjectNormal, WorldObjectNormal, WorldObjectNormalValues, WorldObjectRotation, WorldObjectRotationValues } from "../RotationValues";
import { RaycastData } from "Code/InventoryManager/Item/UseableItem";
import PlayerDataManager from "Code/PlayerDataManager/PlayerDataManager";
import InteractiveWorldState from "./InteractiveWorldState";

@AirshipComponentMenu("World/Interactive World")
export default class InteractiveWorld extends World {

    //#region Inspector Properties

    public occupancy = new Map<Vector3, Vector3>();
    public objects = new Map<Vector3, WorldObjectPlacementData>();
    public clientObjects = new Map<Vector3, GameObject>();
    public tickRate: number = 10;

    public worldObjectDataConnectedClients = new Map<Vector3, Player[]>();

    public static onObjectViewOpened = new NetworkFunction<[worldId: number, position: Vector3], [objectData: WorldObjectPlacementData | undefined]>("InteractiveWorld.onObjectViewOpened");
    public static onObjectDataUpdated = new NetworkSignal<[objectData: WorldObjectPlacementData | undefined]>("InteractiveWorld.onObjectDataUpdated");
    public static onObjectViewClosed = new NetworkSignal<[worldId: number, position: Vector3]>("InteractiveWorld.onObjectViewClosed");

    public static onAddItemToObject = new NetworkSignal<[worldId: number, position: Vector3, itemName: string, quantity: number, location: string | undefined]>("InteractiveWorld.onAddItemToObject");
    public static onTakeItemFromObject = new NetworkSignal<[worldId: number, position: Vector3, itemName: string, location: string | undefined]>("InteractiveWorld.onTakeItemFromObject");

    public static onClientAddObject = new NetworkSignal<[worldId: number, position: Vector3, data: WorldObjectPlacementData]>("InteractiveWorld.onClientAddObject");
    public static onClientRemoveObject = new NetworkSignal<[worldId: number, position: Vector3, data: WorldObjectPlacementData]>("InteractiveWorld.onClientRemoveObject");

    public state: InteractiveWorldState;

    public LoadState(player: Player, id: number, save?: WorldSave): void {
        this.state = new InteractiveWorldState(player, `PlayerWorld:${id}`, save);
    }

    public Awake(): void {
        if ($SERVER) this.AwakeServer();
        if ($CLIENT) this.AwakeClient();
    }

    public GetVisitors(): Player[] {
        const players: Player[] = [];
        this.state.GetKey("visitorIds").forEach((userId) => players.push(Airship.Players.FindByUserId(userId)!));
        return players;
    }

    public IsAuthorized(player: Player): boolean {
        if (this.state.GetKey("authorizedUserIds").includes(player.userId)) return true;
        return false;
    }

    public GetOwner(): Player | undefined {
        return Airship.Players.FindByUserId(this.state.GetKey("ownerId"));
    }

    @Client()
    public AwakeClient(): void {
        InteractiveWorld.onClientAddObject.client.OnServerEvent((worldId, position, data) => {
            if (this.worldId !== worldId) return;
            this.ClientAddBlock(position, data);
        });

        InteractiveWorld.onClientRemoveObject.client.OnServerEvent((worldId, position, data) => {
            if (this.worldId !== worldId) return;
            this.ClientRemoveBlock(position, data);
        });
    }

    @Server()
    public AwakeServer(): void {
        InteractiveWorld.onObjectViewOpened.server.SetCallback((player, worldId, position) => {
            if (this.worldId !== worldId) return;
            const rootPosition = this.SelectRootPositionByOccupancy(position);
            if (!rootPosition) return;
            const object = this.objects.get(rootPosition);
            if (!object) return;
            const item = InventoryManager.Get().Items.get(object.type)!.gameObject.GetAirshipComponent<WorldObjectItem>()!
            if (!item.view) return;
            const players = this.worldObjectDataConnectedClients.getOrInsert(rootPosition, []);
            if (!players.includes(player)) players.push(player);
            this.worldObjectDataConnectedClients.set(rootPosition, players);
            return object;
        });

        InteractiveWorld.onObjectViewClosed.server.OnClientEvent((player, worldId, position) => {
            if (this.worldId !== worldId) return;
            const rootPosition = this.SelectRootPositionByOccupancy(position);
            if (!rootPosition) return;
            const players = this.worldObjectDataConnectedClients.get(rootPosition);
            if (!players) return;
            if (players.includes(player)) players.remove(players.indexOf(player));
            if (players.size() === 0) return this.worldObjectDataConnectedClients.delete(rootPosition);
            else this.worldObjectDataConnectedClients.set(rootPosition, players);
        });

        InteractiveWorld.onAddItemToObject.server.OnClientEvent((player, worldId, position, itemName, quantity, location) => {
            if (this.worldId !== worldId) return;
            const rootPosition = this.SelectRootPositionByOccupancy(position);
            if (!rootPosition) return false;
            const object = this.objects.get(rootPosition);
            if (!object) return false;
            const inventoryItem = InventoryManager.Get().Items.get(object.type)?.gameObject.GetAirshipComponent<InventoryWorldObjectDataItem>();
            if (!inventoryItem) return false;
            inventoryItem.TryInsertItem(worldId, rootPosition, player, itemName, quantity, location);
        });

        InteractiveWorld.onTakeItemFromObject.server.OnClientEvent((player, worldId, position, itemName, location) => {
            if (this.worldId !== worldId) return;
            const rootPosition = this.SelectRootPositionByOccupancy(position);
            if (!rootPosition) return false;
            const object = this.objects.get(rootPosition);
            if (!object) return false;
            const inventoryItem = InventoryManager.Get().Items.get(object.type)?.gameObject.GetAirshipComponent<InventoryWorldObjectDataItem>();
            if (!inventoryItem) return false;
            inventoryItem.TryTakeItem(worldId, rootPosition, player, itemName, location);
        });
    }

    //#endregion

    //#region Break Block

    @Client()
    public ClientRemoveBlock(position: Vector3, worldObjectData: WorldObjectPlacementData): void {
        const obj = this.clientObjects.get(position);
        if (!obj) return;
        Destroy(obj);
        this.RemoveBlockOccupancy(worldObjectData);
        this.objects.delete(position);
        this.clientObjects.delete(position);
    }

    @Server()
    public DeleteBlock(pos: Vector3): void {
        const rootPosition = this.occupancy.get(pos);
        if (!rootPosition) return;
        const worldObjectSave = this.objects.get(rootPosition);
        if (!worldObjectSave) return;
        const dataItem = InventoryManager.Get().Items.get(worldObjectSave.type)?.gameObject.GetAirshipComponent<WorldObjectDataItem>();
        if (dataItem) dataItem.DestroyData(this.worldId, worldObjectSave);
        this.objects.delete(rootPosition);
        this.RemoveBlockOccupancy(worldObjectSave);
        const players = this.worldObjectDataConnectedClients.get(rootPosition);
        if (players) InteractiveWorld.onObjectDataUpdated.server.FireClients(players, undefined);
        InteractiveWorld.onClientRemoveObject.server.FireClients(this.GetVisitors(), this.worldId, pos, worldObjectSave);
    }

    @Server()
    public FireUpdateBlockData(item: WorldObjectDataItem, pos: Vector3, data: WorldObjectPlacementData): void {
        item.OnPostUpdate(this.worldId, data);
        const players = this.worldObjectDataConnectedClients.get(pos);
        if (!players) return;
        InteractiveWorld.onObjectDataUpdated.server.FireClients(players, data);
    }

    protected Update(dt: number): void {
        if ($SERVER) this.TickObjects(dt);
    }

    private _lastTick: number = 0;

    @Server()
    public TickObjects(dt: number): void {
        this._lastTick += dt;
        if (this._lastTick < 1 / this.tickRate) return;

        this.objects.forEach((object, position) => {
            const item = InventoryManager.Get().Items.get(object.type)?.gameObject.GetAirshipComponent<WorldObjectDataItem>();
            if (!item) return;
            const oldData = json.encode(object);
            const data = item.OnTick(this.worldId, this._lastTick, object);
            if (json.encode(data) === oldData) return;
            this.FireUpdateBlockData(item, position, data);
            this.objects.set(position, data);
        });
        this._lastTick = 0;
    }

    @Server()
    public PlayerDeleteBlock(player: Player, pos: Vector3): void {
        pos = MathUtil.FloorVec(pos);
        const rootPosition = this.occupancy.get(pos);
        if (!rootPosition) return;
        const worldObjectSave = this.objects.get(rootPosition);
        if (!worldObjectSave) return;
        const item = InventoryManager.Get().Items.get(worldObjectSave.type);
        if (!item)  throw Logger.Get().Error(`Item not found for '${worldObjectSave.type}'`);
        InventoryManager.Get().TryModifyPlayerItems(player, worldObjectSave.type, 1);
        this.DeleteBlock(rootPosition);
    }

    //#endregion

    //#region Place Block

    public GetObjectRotationFromSave(worldObjectSave: WorldObjectPlacementData): Quaternion {
        return this.GetObjectRotation(worldObjectSave.normal, worldObjectSave.rotation);
    }

    public GetObjectRotation(normal?: WorldObjectNormal, rotation?: WorldObjectRotation): Quaternion {
        if (rotation !== undefined  && normal === undefined ) return WorldObjectRotationValues[rotation];
        if (normal !== undefined && rotation === undefined ) return WorldObjectNormalValues[normal];
        if (rotation !== undefined  && normal !== undefined ) return WorldObjectNormalValues[normal].mul(WorldObjectRotationValues[rotation]);
        return Quaternion.Euler(0, 0, 0);
    }

    @Client()
    public ClientAddBlock(position: Vector3, data: WorldObjectPlacementData): void {
        if (this.clientObjects.get(position)) return;
        const item = InventoryManager.Get().Items.get(data.type)?.gameObject.GetAirshipComponent<WorldObjectItem>();
        if (!item) return;
        const obj = Instantiate(item.prefab, this.gameObject.transform);
        obj.transform.position = position;
        obj.transform.rotation = this.GetObjectRotationFromSave(data);
        this.clientObjects.set(position, obj);
        this.AddBlockOccupancy(data);
        this.objects.set(position, data);
    }

    @Server()
    public AddBlock(item: WorldObjectItem, worldObjectSave: WorldObjectPlacementData): void {
        const dataItem = item.gameObject.GetAirshipComponent<WorldObjectDataItem>();
        if (dataItem && !worldObjectSave.data) {
            worldObjectSave = dataItem.CreateData(this.worldId, worldObjectSave);
        }
        this.objects.set(worldObjectSave.position, worldObjectSave);
        this.AddBlockOccupancy(worldObjectSave);
        InteractiveWorld.onClientAddObject.server.FireClients(this.GetVisitors(), this.worldId, worldObjectSave.position, worldObjectSave);
    }

    @Server()
    public PlaceBlock(item: WorldObjectItem, position: Vector3, normal?: WorldObjectNormal, rotation?: WorldObjectRotation): void {
        position = MathUtil.FloorVec(position);
        const worldObjectSave = this.CreateObjectSave(item, position, rotation, normal);
        this.AddBlock(item, worldObjectSave);
    }

    //#endregion

    //#region Occupancy

    public ForEachFloorBlock(worldObjectSave: WorldObjectPlacementData, func: (occupancyPos: Vector3) => void): void {
        const worldObjectItem = InventoryManager.Get().Items.get(worldObjectSave.type)?.gameObject.GetAirshipComponent<WorldObjectItem>();
        if (!worldObjectItem) return;
        worldObjectItem.floorSupport.forEach((occupancyOffset) => {
            func(MathUtil.RoundVec(worldObjectSave.position.add(this.GetObjectRotationFromSave(worldObjectSave).mul(occupancyOffset))));
        });
    }
    
    public ForEachBlockOccupancy(worldObjectSave: WorldObjectPlacementData, func: (occupancyPos: Vector3) => void): void {
        const worldObjectItem = InventoryManager.Get().Items.get(worldObjectSave.type)?.gameObject.GetAirshipComponent<WorldObjectItem>();
        if (!worldObjectItem) return;
        worldObjectItem.occupancy.forEach((occupancyOffset) => {
            func(MathUtil.RoundVec(worldObjectSave.position.add(this.GetObjectRotationFromSave(worldObjectSave).mul(occupancyOffset))));
        });
    }

    public AddBlockOccupancy(worldObjectSave: WorldObjectPlacementData): void {
        this.ForEachBlockOccupancy(worldObjectSave, (occupancyPos) => {
            this.occupancy.set(occupancyPos, worldObjectSave.position);
        });
    }

    public RemoveBlockOccupancy(worldObjectSave: WorldObjectPlacementData): void {
        this.ForEachBlockOccupancy(worldObjectSave, (occupancyPos) => {
            this.occupancy.delete(occupancyPos);
        });
    }

    public GetCollisions(worldObjectSave: WorldObjectPlacementData): Vector3[] {
        const collisions: Vector3[] = [];
        this.ForEachBlockOccupancy(worldObjectSave, (occupancyPos) => {
            const collision = this.occupancy.get(occupancyPos);
            if (collision) collisions.push(occupancyPos);
        });
        return collisions;
    }

    public GetMissingFloor(worldObjectSave: WorldObjectPlacementData): Vector3[] {
        const missingFloors: Vector3[] = [];
        this.ForEachFloorBlock(worldObjectSave, (floorPos) => {
            const collision = this.occupancy.get(floorPos);
            if (collision) {
                const object = InventoryManager.Get().Items.get(this.objects.get(collision)!.type)!.gameObject.GetAirshipComponent<WorldObjectItem>()!;
                if (object.supportBlock) return;
            }
            missingFloors.push(floorPos);
        });
        
        return missingFloors;
    }

    //#endregion

    //#region Block Selection

    public SelectRootPositionByOccupancy(pos: Vector3): Vector3 | undefined {
        pos = MathUtil.FloorVec(pos);
        return this.occupancy.get(pos);
    }

    @Client()
    public SendRay(origin: Vector3, direction: Vector3): {position: Vector3, normal: Vector3 } | undefined {
        const layers = Layer.CHARACTER;
        const physicsRay = Physics.Raycast(origin, direction, this.maxInteractDistance, layers);
        if (!physicsRay[0]) return;
        return {
            position: physicsRay[1],
            normal: physicsRay[2],
        }
    }

    public CreateObjectSave(item: WorldObjectItem, position: Vector3, rotation?: WorldObjectRotation, normal?: WorldObjectNormal): WorldObjectPlacementData {
        const objectSave: WorldObjectPlacementData = {
            type: item.internalName,
            position: position,
        }
        if (item.canChangeRotation && rotation) objectSave.rotation = rotation;
        if (item.canChangeNormal && normal) objectSave.normal = normal;
        return objectSave;
    }

    public ModifyObjectSave(item: WorldObjectItem, data: WorldObjectPlacementData): WorldObjectPlacementData {
        const objectSave: WorldObjectPlacementData = {
            type: data.type,
            position: this.position,
        }
        if (item.canChangeRotation) objectSave.rotation = data.rotation;
        if (item.canChangeNormal) objectSave.normal = data.normal;
        return objectSave;
    }

    /**
     * Raycasts a voxel position from the player camera.
     * @param world The world to raycast in.
     * @param mode Select gets the targeted block. Place gets the block on the selected block in the direction to the player. AirPlace gets the block in the direction of the edge of the selected block.
     * @returns The position of the block if any.
     */
    @Client()
    public RaycastBlock(mode: "Select" | "Place" = "Select"): RaycastData | undefined {
        if (!$CLIENT) {
            Logger.Get().DebugWarn(`Cannot raycast voxel on server.`);
            return undefined;
        }
        
        let position: Vector3;
        if(Input.touchCount > 0) {
            position = new Vector3(Input.GetTouch(0).position.x, Input.GetTouch(0).position.y, 0);
        } else {
            position = Input.mousePosition;
        }

        const ray = Airship.Camera.cameraSystem!.GetActiveCamera().ScreenPointToRay(position);
        const res = this.SendRay(ray.origin, ray.direction);
        if (!res) return undefined;
        const normal = MathUtil.RoundVec(MathUtil.RoundVec(Vector3.Normalize(res.normal)));
        const pos = MathUtil.RoundVec(MathUtil.RoundVec(res.position.sub(normal.div(2))));

        const rot = PlayerDataManager.Get().GetLocalState().state.GetKey("rotation") as WorldObjectRotation;

        if (mode === "Place") {
            const settings = SettingsManager.Get().GetAirPlaceSettings();
            if (!settings.enabled) return {
                rotation: rot,
                position: pos.add(normal),
                normal: GetWorldObjectNormal(normal.mul(-1)),
            };
            const offset = pos.sub(res.position).add(new Vector3(0.5, 0.5, 0.5));
            if (offset.x < settings.range) pos.add(new Vector3(-1, 0, 0));
            if (offset.x > 1 - settings.range) pos.add(new Vector3(1, 0, 0));
            if (offset.y < settings.range) pos.add(new Vector3(0, -1, 0));
            if (offset.y > 1 - settings.range) pos.add(new Vector3(0, 1, 0));
            if (offset.z < settings.range) pos.add(new Vector3(0, 0, -1));
            if (offset.z > 1 - settings.range) pos.add(new Vector3(0, 0, 1));
        }
        return {
            rotation: rot,
            position: pos,
            normal: 0, //GetWorldObjectNormal(normal.mul(-1)),
        };
    }

    //#endregion
}
