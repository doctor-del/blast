import { GameEvents } from "../config/GameEvents";

const { ccclass, property } = cc._decorator;

export enum BoosterType {
	Bomb = 0,
	Teleport = 1
}

@ccclass
export default class BoosterView extends cc.Component {

	@property(BoosterType)
	type:BoosterType = BoosterType.Bomb;

	@property(cc.Label)
	slotLabel:cc.Label = null;

	@property(cc.Button)
	button:cc.Button = null;

	setBoostLabel(value:number):void {
		this.slotLabel.string = `${value}`;
	}

	setInteractable(state:boolean):void {
		if (this.button) {
			this.button.interactable = state;
		}
		this.node.opacity = state ? 255 : 120;
	}

	private onLoad():void {
		this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
	}

	private onDestroy():void {
		this.node.off(cc.Node.EventType.TOUCH_END, this.onClick, this);
	}

	private onClick():void {
		if (!this.button.interactable) {
			return;
		}
		this.node.parent.emit(GameEvents.BoosterClicked, this.type);
	}
}