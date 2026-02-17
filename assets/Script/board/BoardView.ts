import BoardModel, { BlockType } from "./BoardModel";
import Cell from "../game/types/Cell";
import { GameEvents } from "../config/GameEvents";
import TileView from "./TileView";
import TilePool from "./TilePool";
import { GameConfig } from "../config/GameConfig";

const { ccclass, property } = cc._decorator;

@ccclass
export default class BoardView extends cc.Component {

	@property(TilePool)
	pool:TilePool = null;

	@property(cc.SpriteFrame)
	superRowSprite:cc.SpriteFrame = null;

	@property(cc.SpriteFrame)
	superColumnSprite:cc.SpriteFrame = null;

	private model:BoardModel;
	private tiles:TileView[][] = [];
	private pendingAnimations:number = 0;
	private completeCallback:Function = null;

	private onDestroy():void {
		this.node.off(GameEvents.TileClicked, this.onTileClicked, this);
	}

	init(model:BoardModel):void {
		this.model = model;
		this.pool.preload(this.model.rows * this.model.cols);
		this.node.on(GameEvents.TileClicked, this.onTileClicked, this);
		this.draw();
	}

	private draw():void {
		for (let r = 0; r < this.model.rows; r++) {
			this.tiles[r] = [];
			for (let c = 0; c < this.model.cols; c++) {
				this.createTile(r, c);
			}
		}
	}

	private createTile(r:number, c:number):TileView {
		const node = this.pool.get();
		node.parent = this.node;

		node.x = c * GameConfig.blockSizeW;
		node.y = -r * GameConfig.blockSizeH;
		const view = node.getComponent(TileView);
		view.init(r, c, this.model.get(r, c).color);
		this.tiles[r][c] = view;
		return view;
	}

	updateBlockVisual(row:number, col:number, type:BlockType):void {
		const node = this.getTileNode(row, col);
		if (type === BlockType.SuperRow) {
			node.getComponent(cc.Sprite).spriteFrame = this.superRowSprite;
		}
		if (type === BlockType.SuperColumn) {
			node.getComponent(cc.Sprite).spriteFrame = this.superColumnSprite;
		}
	}

	private getTileNode(row:number, col:number):cc.Node {
		return this.tiles[row][col].node;
	}

	playRemove(group:Cell[], onComplete:Function):void {
		this.pendingAnimations = group.length;
		this.completeCallback = onComplete;

		for (let i = 0; i < group.length; i++) {
			const p = group[i];
			const view = this.tiles[p.row][p.col];
			this.tiles[p.row][p.col] = null;
			cc.tween(view.node)
				.parallel(
					cc.tween().to(0.15, { scale:0 }),
					cc.tween().to(0.15, { opacity:0 })
				)
				.call(() => {
					this.pool.put(view.node);
					this.onAnimComplete();
				})
				.start();
		}
	}

	playCollapse(moves:CollapseMove[], onComplete:Function):void {
		if (moves.length === 0) {
			onComplete();
			return;
		}

		this.pendingAnimations = moves.length;
		this.completeCallback = onComplete;
		for (let i = 0; i < moves.length; i++) {
			const m = moves[i];
			if (m.fromR >= 0) {
				const view = this.tiles[m.fromR][m.c];
				this.tiles[m.toR][m.c] = view;
				this.tiles[m.fromR][m.c] = null;
				view.row = m.toR;
				view.col = m.c;

				cc.tween(view.node)
					.to(0.2, { y:-m.toR * GameConfig.blockSizeH })
					.call(this.onAnimComplete, this)
					.start();
			} else {
				const view = this.createTile(m.toR, m.c);
				view.node.y = GameConfig.blockSizeH;

				cc.tween(view.node)
					.to(0.2, { y:-m.toR * GameConfig.blockSizeH })
					.call(this.onAnimComplete, this)
					.start();
			}
		}
	}

	private onAnimComplete():void {
		this.pendingAnimations--;
		if (this.pendingAnimations === 0 && this.completeCallback) {
			const callback = this.completeCallback;
			this.completeCallback = null;
			callback();
		}
	}

	syncWithModel(onComplete:Function):void {
		this.pendingAnimations = this.model.rows * this.model.cols;
		this.completeCallback = onComplete;
		for (let r = 0; r < this.model.rows; r++) {
			for (let c = 0; c < this.model.cols; c++) {
				const view = this.tiles[r][c];
				if (!view) {
					continue;
				}
				const block = this.model.get(r, c);
				view.setType(block.color);

				cc.tween(view.node)
					.to(0.1, { scale:0.8 })
					.to(0.1, { scale:1 })
					.call(this.onAnimComplete, this)
					.start();
			}
		}
	}

	playSwap(a:Cell, b:Cell, onComplete:() => void):void {
		const nodeA = this.getTileNode(a.row, a.col);
		const nodeB = this.getTileNode(b.row, b.col);
		const posA = nodeA.position.clone();
		const posB = nodeB.position.clone();

		let finished = 0;
		const done = () => {
			finished++;
			if (finished === 2) {
				this.swapViewNodes(a, b);
				onComplete && onComplete();
			}
		};
		cc.tween(nodeA)
			.to(0.2, { position:posB })
			.call(done)
			.start();
		cc.tween(nodeB)
			.to(0.2, { position:posA })
			.call(done)
			.start();
	}

	private swapViewNodes(a:Cell, b:Cell):void {
		const temp = this.tiles[a.row][a.col];
		this.tiles[a.row][a.col] = this.tiles[b.row][b.col];
		this.tiles[b.row][b.col] = temp;
	}

	private onTileClicked(data:Cell):void {
		this.node.emit(GameEvents.BoardClicked, data);
	}
}