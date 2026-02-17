import Cell from "../game/types/Cell";
import { TileType } from "../config/GameConfig";

export enum BlockType {
	Normal = 0,
	SuperRow = 100,
	SuperColumn = 101
}

export interface CollapseMove {
	fromR:number;
	toR:number;
	c:number;
}

export class Block {
	constructor(public color:number, public type:BlockType = BlockType.Normal) {
	}
}

export default class BoardModel {
	rows:number;
	cols:number;

	private grid:(Block | null)[][] = [];
	private const maxTileTypes:number = 5;

	constructor(rows:number, cols:number) {
		this.rows = rows;
		this.cols = cols;
		this.generate();
	}

	generate():void {
		for (let r = 0; r < this.rows; r++) {
			this.grid[r] = [];
			for (let c = 0; c < this.cols; c++) {
				this.grid[r][c] = new Block(this.randomType());
			}
		}
	}

	randomType():number {
		return Math.floor(Math.random() * this.maxTileTypes);
	}

	get(r:number, c:number):Block | null {
		if (!this.isValid(r, c)) {
			return null;
		}
		return this.grid[r][c];
	}

	setBlockType(row:number, col:number, type:BlockType):void {
		this.grid[row][col].type = type;
	}

	isValid(r:number, c:number):boolean {
		return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
	}

	findGroup(row:number, col:number):Cell[] {
		const target = this.get(row, col);
		if (target === null) {
			return [];
		}
		const visited = {};
		const stack = [new Cell(row, col)];
		const result = [];

		while (stack.length) {
			const p = stack.pop();
			const key = `${p.row}_${p.col}`;
			if (visited[key]) {
				continue;
			}
			visited[key] = true;

			if (!this.isValid(p.row, p.col)) {
				continue;
			}
			if (this.get(p.row, p.col).color !== target.color) {
				continue;
			}
			result.push(p);
			stack.push(new Cell(p.row + 1, p.col));
			stack.push(new Cell(p.row - 1, p.col));
			stack.push(new Cell(p.row, p.col + 1));
			stack.push(new Cell(p.row, p.col - 1));
		}

		return result;
	}

	getCellsInRadius(row:number, col:number, radius:number):Cell[] {
		const result = [];
		for (let r = row - radius; r <= row + radius; r++) {
			for (let c = col - radius; c <= col + radius; c++) {
				if (!this.isInside(r, c)) {
					continue;
				}
				if (this.grid[r][c] !== null) {
					result.push(new Cell(r, c));
				}
			}
		}
		return result;
	}

	private isInside(row:number, col:number):boolean {
		return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
	}

	remove(group:Cell[]):void {
		group.forEach(p => {
			this.grid[p.row][p.col] = null;
		});
	}

	collapse():CollapseMove[] {
		const moves:CollapseMove[] = [];
		for (let c = 0; c < this.cols; c++) {
			let empty = this.rows - 1;
			for (let r = this.rows - 1; r >= 0; r--) {
				if (this.grid[r][c] !== null) {
					if (r !== empty) {
						this.grid[empty][c] = this.grid[r][c];
						this.grid[r][c] = null;
						moves.push({ fromR:r, toR:empty, c });
					}
					empty--;
				}
			}
			for (let r = empty; r >= 0; r--) {
				this.grid[r][c] = new Block(this.randomType());
				moves.push({ fromR:-1, toR:r, c });
			}
		}
		return moves;
	}

	hasAvailableMoves():boolean {
		for (let r = 0; r < this.rows; r++) {
			for (let c = 0; c < this.cols; c++) {
				const block = this.grid[r][c];
				if (block === null || block.type > BlockType.Normal) {
					continue;
				}
				if (c + 1 < this.cols && this.grid[r][c + 1].color === block.color) {
					return true;
				}
				if (r + 1 < this.rows && this.grid[r + 1][c].color === block.color) {
					return true;
				}
			}
		}
		return false;
	}

	shuffle():void {
		for (let r = this.rows - 1; r >= 0; r--) {
			for (let c = this.cols - 1; c >= 0; c--) {
				const r2 = (Math.random() * this.rows) | 0;
				const c2 = (Math.random() * this.cols) | 0;
				const tmp = this.grid[r][c];
				this.grid[r][c] = this.grid[r2][c2];
				this.grid[r2][c2] = tmp;
			}
		}
	}

	swap(a:Cell, b:Cell):void {
		const temp = this.grid[a.row][a.col];
		this.grid[a.row][a.col] = this.grid[b.row][b.col];
		this.grid[b.row][b.col] = temp;
	}
}