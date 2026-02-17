import BoardModel, { BlockType } from "../board/BoardModel";
import BoardView from "../board/BoardView";
import BoosterView, { BoosterType } from "../booster/BoosterView";
import Cell from "../game/types/Cell";
import UIController from "../ui/UIController";
import { GameEvents } from "../config/GameEvents";
import { GameConfig } from "../config/GameConfig";

const { ccclass, property } = cc._decorator;

enum InputMode {
	Normal,
	Bomb,
	TeleportSelectFirst,
	TeleportSelectSecond
}

@ccclass
export default class GameController extends cc.Component {

	@property(BoardView)
	boardView:BoardView = null;

	@property(UIController)
	ui:UIController = null;

	@property(cc.Node)
	boosterPanel:cc.Node = null;
	private boosters:BoosterView[] = [];

	private reshuffleCount:number = 0;
	private readonly MAX_RESHUFFLE = 3;

	private model:BoardModel;
	private busy:boolean = false;

	private score:number = 0;
	private movesLeft:number = 0;

	private boosterCounts:Map<BoosterType, number> = new Map();
	private inputMode:InputMode = InputMode.Normal;
	private teleportFirst:Cell | null = null;

	onLoad():void {
		this.model = new BoardModel(GameConfig.rows, GameConfig.cols);
		this.boardView.init(this.model);
		this.boardView.node.on(GameEvents.BoardClicked, this.onBlockClicked, this);
		cc.systemEvent.on(GameEvents.RestartGame, this.resetGame, this);

		this.boosterPanel.on(GameEvents.BoosterClicked, this.onBoosterClicked, this);
		this.boosters = this.boosterPanel.getComponentsInChildren(BoosterView);
		this.boosterCounts.set(BoosterType.Bomb, GameConfig.bombMaxCount);
		this.boosterCounts.set(BoosterType.Teleport, GameConfig.teleportMaxCount);
		this.updateBoosters();

		this.score = 0;
		this.movesLeft = GameConfig.maxMoves;
		this.ui.setScore(this.score);
		this.ui.setMoves(this.movesLeft);
	}

	onDestroy():void {
		if (this.boardView.node) {
			this.boardView.node.off(GameEvents.BoardClicked, this.onBlockClicked, this);
		}
		cc.systemEvent.off(GameEvents.RestartGame, this.resetGame, this);
		if (this.boosterPanel) {
			this.boosterPanel.off(GameEvents.BoosterClicked, this.onBoosterClicked, this);
		}
	}

	private updateBoosters():void {
		this.boosters.forEach(booster => {
			const count = this.boosterCounts.get(booster.type) || 0;
			booster.setBoostLabel(count);
			booster.setInteractable(count > 0);
		});
	}

	private decBoosterCount(type:BoosterType):void {
		const count = this.boosterCounts.get(type) - 1 || 0;
		this.boosterCounts.set(type, count);
		this.updateBoosters();
	}

	private updateMoves(group:Cell[], isSuper:boolean = false):void {
		this.busy = false;
		this.movesLeft--;
		this.ui.setMoves(this.movesLeft);
		this.calculateScore(group.length, isSuper);
	}

	private calculateScore(groupSize:number, isBooster:boolean = false):void {
		const gained = groupSize * groupSize * 5;
		this.score += isBooster ? Math.floor(gained / 3) : gained;
		this.ui.animateScore(this.score);
	}

	private onBlockClicked(data:Cell):void {
		if (this.busy) {
			return;
		}
		switch (this.inputMode) {
			case InputMode.Normal:
				this.handleNormalClick(data.row, data.col);
				break;

			case InputMode.Bomb:
				this.handleBomb(data.row, data.col);
				break;

			case InputMode.TeleportSelectFirst:
			case InputMode.TeleportSelectSecond:
				this.handleTeleport(data.row, data.col);
				break;
		}
	}

	private onBoosterClicked(type:BoosterType):void {
		switch (type) {
			case BoosterType.Bomb:
				cc.log("accepted bomb");
				this.inputMode = InputMode.Bomb;
				break;

			case BoosterType.Teleport:
				cc.log("accepted teleport");
				this.inputMode = InputMode.TeleportSelectFirst;
				break;
		}
	}

	private checkGameState():void {
		if (this.score >= GameConfig.targetScore) {
			cc.log("Победа!");
			this.ui.winShow("Победа!", this.score);
			this.busy = true;
			return;
		}
		if (this.movesLeft <= 0) {
			cc.log("Проигрыш!");
			this.ui.winShow("Проигрыш!", this.score);
			this.busy = true;
			return;
		}
		if (!this.model.hasAvailableMoves()) {
			this.tryReshuffle();
		} else {
			this.busy = false;
		}
	}

	private tryReshuffle():void {
		if (this.reshuffleCount >= this.MAX_RESHUFFLE) {
			cc.log("Игра закончена");
			this.ui.winShow("Игра закончена!", this.score);
			this.busy = true;
			return;
		}
		this.reshuffleCount++;
		cc.log("Reshuffle:", this.reshuffleCount);
		this.model.shuffle();
		this.boardView.syncWithModel(() => {
			if (!this.model.hasAvailableMoves()) {
				this.tryReshuffle();
			} else {
				this.busy = false;
			}
		});
	}

	// Обычный клик по тайлу
	private handleNormalClick(row:number, col:number):void {
		if (this.movesLeft <= 0) {
			return;
		}
		if (!this.model.isValid(row, col)) {
			return;
		}
		// Проверка на использование супер блока
		const block = this.model.get(row, col);
		if (block.type === BlockType.SuperRow) {
			this.activateSuperRow(row);
			return;
		}
		if (block.type === BlockType.SuperColumn) {
			this.activateSuperColumn(col);
			return;
		}

		const group = this.model.findGroup(row, col);
		if (group.length < GameConfig.minGroup) {
			return;
		}
		this.updateMoves(group);
		if (group.length >= GameConfig.superTileCount) {
			this.spawnSuperBlock(row, col, group);
		} else {
			this.model.remove(group);
			this.boardView.playRemove(group, () => {
				const moves = this.model.collapse();
				this.boardView.playCollapse(moves, () => {
					this.checkGameState();
				});
			});
		}
	}

	private spawnSuperBlock(row:number, col:number, group:Cell[]):void {
		const filtered = group.filter(c => !(c.row === row && c.col === col));
		this.model.remove(filtered);

		// Случайное появление супер тайла строки либо столбца
		const type = Math.random() > 0.5 ? BlockType.SuperRow : BlockType.SuperColumn;
		this.model.setBlockType(row, col, type);
		this.boardView.playRemove(filtered, () => {
			this.boardView.updateBlockVisual(row, col, type);
			const moves = this.model.collapse();
			this.boardView.playCollapse(moves, () => {
				this.checkGameState();
			});
		});
	}

	// Клик по тайлу в режиме бомба
	private handleBomb(row:number, col:number):void {
		const r = GameConfig.bombRadius;
		const cells = this.model.getCellsInRadius(row, col, r);
		if (cells.length === 0) {
			this.inputMode = InputMode.Normal;
			return;
		}
		this.busy = true;
		this.inputMode = InputMode.Normal;
		this.calculateScore(cells.length, true);
		this.decBoosterCount(BoosterType.Bomb);
		this.model.remove(cells);
		this.boardView.playRemove(cells, () => {
			const moves = this.model.collapse();
			this.boardView.playCollapse(moves, () => {
				this.checkGameState();
			});
		});
	}

	// Клик по тайлу в режиме телепорта
	private handleTeleport(row:number, col:number):void {
		if (!this.teleportFirst) {
			this.teleportFirst = new Cell(row, col);
			this.inputMode = InputMode.TeleportSelectSecond;
			return;
		}

		const second = new Cell(row, col);
		const first = this.teleportFirst;
		this.busy = true;
		this.boardView.playSwap(first, second, () => {
			this.model.swap(first, second);
			const group1 = this.model.findGroup(first.row, first.col);
			const group2 = this.model.findGroup(second.row, second.col);
			const block1 = this.model.get(first.row, first.col);
			const block2 = this.model.get(second.row, second.col);
			if ((group1.length >= GameConfig.minGroup || group2.length >= GameConfig.minGroup) &&
				block1.color !== block2.color && block1.type === BlockType.Normal && block1.type === block2.type) {
				this.resolveAfterSwap(group1, group2);
			} else {
				// Делаем смену обратно, если не собрана группа и если одинковый цвет и если обычные тайлы
				this.boardView.playSwap(first, second, () => {
					this.model.swap(first, second);
					this.busy = false;
				});
			}
		});
		this.teleportFirst = null;
		this.inputMode = InputMode.Normal;
	}

	private resolveAfterSwap(group1:Cell[], group2:Cell[]):void {
		let all = [];
		if (group1.length >= GameConfig.minGroup) {
			all = all.concat(group1);
		}
		if (group2.length >= GameConfig.minGroup) {
			all = all.concat(group2);
		}
		this.calculateScore(all.length);
		this.decBoosterCount(BoosterType.Teleport);
		this.model.remove(all);
		this.boardView.playRemove(all, () => {
			const moves = this.model.collapse();
			this.boardView.playCollapse(moves, () => {
				this.checkGameState();
			});
		});
	}

	private activateSuperRow(row:number):void {
		const cells = [];
		for (let c = 0; c < this.model.cols; c++) {
			cells.push(new Cell(row, c));
		}
		this.destroySuperBlock(cells);
	}

	private activateSuperColumn(col:number):void {
		const cells = [];
		for (let r = 0; r < this.model.rows; r++) {
			cells.push(new Cell(r, col));
		}
		this.destroySuperBlock(cells);
	}

	private destroySuperBlock(cells:Cell[]):void {
		this.updateMoves(cells, true);
		this.model.remove(cells);
		this.boardView.playRemove(cells, () => {
			const moves = this.model.collapse();
			this.boardView.playCollapse(moves, () => {
				this.checkGameState();
			});
		});
	}

	private resetGame():void {
		cc.director.loadScene(cc.director.getScene().name);
	}
}