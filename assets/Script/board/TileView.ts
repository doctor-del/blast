import { GameEvents } from "../config/GameEvents";
import { TileType } from "../config/GameConfig";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TileView extends cc.Component {

	@property(cc.SpriteFrame)
	sprites:cc.SpriteFrame[] = [];

	row:number;
	col:number;
	type:TileType;

	private onLoad():void {
		this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
	}

	private onDestroy():void {
		this.node.off(cc.Node.EventType.TOUCH_END, this.onClick, this);
	}

	init(r:number, c:number, type:TileType):void {
		this.row = r;
		this.col = c;
		this.node.setScale(1, 1);
		this.node.opacity = 255;
		this.setType(type);
	}

	setType(type:TileType):void {
		this.type = type;

		const sprite = this.getComponent(cc.Sprite);
		sprite.spriteFrame = this.sprites[type];
	}

	prepareForAnimation():void {
		cc.Tween.stopAllByTarget(this.node);
		this.node.setScale(1, 1);
		this.node.opacity = 255;
	}

	private onClick():void {
		this.node.parent.emit(GameEvents.TileClicked, {
			row:this.row,
			col:this.col
		});
	}
}