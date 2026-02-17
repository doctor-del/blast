export enum TileType {
	Blue = 0,
	Green = 1,
	Purpure = 2,
	Red = 3,
	Yellow = 4
}

interface IGameConfig {
	rows:number;
	cols:number;
	blockSizeW:number;
	blockSizeH:number;
	minGroup:number;			// Минимальная группа удаляемых тайлов
	targetScore:number;			// Цель очков
	maxMoves:number;			// Максимальное количество ходов
	bombMaxCount:number;		// Максимальное количество бустов бомба
	teleportMaxCount:number;	// Максимальное количество бустов телепорт
	bombRadius:number;			// Радиус взрыва бомбы по квадрату
	superTileCount:number;		// Количество удаляемых тайлов для появления супер тайла
}

export const GameConfig:IGameConfig = {
	rows:9,
	cols:9,
	blockSizeW:100,
	blockSizeH:112,
	minGroup:2,
	targetScore:2000,
	maxMoves:20,
	bombMaxCount:2,
	teleportMaxCount:2,
	bombRadius:1,
	superTileCount:5
};