import { Player } from "@Easy/Core/Shared/Player/Player";

@CreateAssetMenu()
export default class CharacterAnimation extends AirshipScriptableObject {
    public clip: AnimationClip;
    public transition: number = 0;
    public layer: CharacterAnimationLayer = CharacterAnimationLayer.OVERRIDE_1;

    public Play(player: Player): void {
        player.character?.animationHelper.PlayAnimation(this.clip, this.layer, this.transition);
    }

    public Stop(player: Player): void {
        player.character?.animationHelper.StopAnimation(this.layer, this.transition);
    }
}