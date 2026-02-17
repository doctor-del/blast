import TileView from "./TileView";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TilePool extends cc.Component {

	@property(cc.Prefab)
	tilePrefab:cc.Prefab = null;

	private pool:cc.NodePool = new cc.NodePool();

	preload(count:number):void {
		for (let i = 0; i < count; i++) {
			const node = cc.instantiate(this.tilePrefab);
			this.pool.put(node);
		}
	}

	get():cc.Node {
		let node:cc.Node;
		if (this.pool.size() > 0) {
			node = this.pool.get();
		} else {
			node = cc.instantiate(this.tilePrefab);
		}
		const view = node.getComponent(TileView);
		if (view) {
			view.row = -1;
			view.col = -1;
		}
		view.prepareForAnimation();
		return node;
	}

	put(node:cc.Node):void {
		const view = node.getComponent(TileView);
		if (view) {
			view.row = -1;
			view.col = -1;
		}
		view.prepareForAnimation();
		node.removeFromParent(false);
		this.pool.put(node);
	}
}