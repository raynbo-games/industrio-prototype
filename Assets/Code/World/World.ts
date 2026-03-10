import { Bin } from "@Easy/Core/Shared/Util/Bin";
import PlayerWorld from "./PlayerWorld/PlayerWorld";
import InteractiveVoxelWorld from "./InteractiveWorld/InteractiveWorld";

export enum WorldServerType {
	Shared = "Shared",
	PerPlayer = "PerPlayer",
}

export enum WorldType {
	BaseWorld = "BaseWorld",
	PlayerWorld = "PlayerWorld",
	InteractiveWorld = "InteractiveWorld"
}

export type WorldFromEnum<EnumValue extends WorldType> = EnumValue extends WorldType.BaseWorld ? World 
	: EnumValue extends WorldType.PlayerWorld ? PlayerWorld 
	: EnumValue extends WorldType.InteractiveWorld ? InteractiveVoxelWorld 
	: never;

@AirshipComponentMenu("World/World")
export default class World extends AirshipBehaviour {
	public worldName: string = "";
	public worldServerType: WorldServerType = WorldServerType.PerPlayer;
	
	@NonSerialized()
	public worldId: number = -1;

	@NonSerialized()
	public position = Vector3.zero;

	/**
	 * The size of the world with origin = size / 2
	 */
	public size = new Vector3(300, 100, 300);

	/**
	 * Max distance that the player can interact with blocks to.
	 */
	public maxInteractDistance: number = 30;

	private bin = new Bin();

	override OnDestroy(): void {
		this.bin.Clean();
	}
}
