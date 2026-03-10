import { Airship } from "@Easy/Core/Shared/Airship";
import { ChatCommand } from "@Easy/Core/Shared/Commands/ChatCommand";
import { Player } from "@Easy/Core/Shared/Player/Player";
import InventoryManager from "./InventoryManager";
import PlayerDataManager from "Code/PlayerDataManager/PlayerDataManager";
import ObjectUtils from "@Easy/Core/Shared/Util/ObjectUtils";

export class TakeCommand extends ChatCommand {
	constructor() {
		super("take", ["g"], "<userName> <itemName>", "takes all items (or of a given type) from the player", true);
	}

	public Execute(player: Player, args: string[]): void {
		if (args.size() < 1) return Airship.Chat.BroadcastMessage(`Missing Username!`);
		const targetPlayer = Airship.Players.FindByUsername(args[0]);
		if (!targetPlayer) return Airship.Chat.BroadcastMessage(`Invalid Username: ${args[0]}`);
		const inventory = PlayerDataManager.Get().GetPlayerState(targetPlayer).inventory;
        if (args.size() < 2) {
			ObjectUtils.keys(inventory.GetState()).forEach((itemName) => {
				inventory.SetKey(itemName, {
					quantity: 0,
					slot: -1,
				});
			});
			return Airship.Chat.BroadcastMessage(`Removed All Items From ${player.username}`);
		}
		const item = InventoryManager.Get().Items.get(args[1]);
		if (!item) return Airship.Chat.BroadcastMessage(`Invalid Item: ${args[1]}`);
		const slotData = inventory.GetKey(item.internalName);
		inventory.SetKey(item.internalName, {
			quantity: 0,
			slot: -1,
		});
		return Airship.Chat.BroadcastMessage(`Removed ${slotData.quantity} ${item.displayName} From ${player.username}`);
	}
}