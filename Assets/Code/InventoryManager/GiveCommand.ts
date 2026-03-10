import { Airship } from "@Easy/Core/Shared/Airship";
import { ChatCommand } from "@Easy/Core/Shared/Commands/ChatCommand";
import { Player } from "@Easy/Core/Shared/Player/Player";
import InventoryManager from "./InventoryManager";
import ItemManager from "./ItemManager";

export class GiveCommand extends ChatCommand {
	constructor() {
		// command name, alias, usage hints, and description
		super("give", ["g"], "<itemName> <quantity?>", "gives the player items", true);
	}

	// Player that sent the command and the variables passed through as string arguments
	public Execute(player: Player, args: string[]): void {
        const itemId = tonumber(args[0]);
		if (!itemId) return Airship.Chat.BroadcastMessage(`Invalid item id`);
        const quantity = tonumber(args[1]);

		const item = ItemManager.Get().GetItem(itemId);

        if (!item) Airship.Chat.BroadcastMessage(`Invalid Item: ${itemId}`);

        InventoryManager.Get().TryModifyPlayerItems(player, itemId, quantity ?? 1);

		Airship.Chat.BroadcastMessage(`Gave ${player.username} ${quantity} ${itemId}`);
	}
}