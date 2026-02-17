import { GameConfig } from "../config/GameConfig";
import { GameEvents } from "../config/GameEvents";

const { ccclass, property } = cc._decorator;

@ccclass
export default class UIController extends cc.Component {

	@property(cc.Label)
	scoreLabel:cc.Label = null;

	@property(cc.Label)
	movesLabel:cc.Label = null;

	@property(cc.Label)
	winLabel:cc.Label = null;

	@property(cc.Label)
	winScoreLabel:cc.Label = null;

	private displayedScore:number = 0;
	private scoreTween:cc.Tween<any> = null;

	setScore(value:number):void {
		this.displayedScore = value;
		this.scoreLabel.string = `${value}/${GameConfig.targetScore}`;
	}

	setMoves(value:number):void {
		this.movesLabel.string = `${value}`;
	}

	animateScore(targetScore:number, duration:number = 0.4):void {
		if (this.scoreTween) {
			this.scoreTween.stop();
			this.scoreTween = null;
		}
		const gameConfigScore = GameConfig.targetScore;
		const startScore = this.displayedScore;
		targetScore = targetScore > gameConfigScore ? gameConfigScore : targetScore;
		const diff = targetScore - startScore;
		if (diff === 0) {
			return;
		}

		const data = { value:0 };
		this.scoreTween = cc.tween(data)
			.to(duration, { value:1 }, {
				easing:"quadOut",
				progress:(start, end, current, ratio) => {
					const currentValue = startScore + diff * ratio;
					this.displayedScore = Math.floor(currentValue);
					this.scoreLabel.string = `${this.displayedScore}/${gameConfigScore}`;
					return current;
				}
			})
			.call(() => {
				this.displayedScore = targetScore;
				this.scoreLabel.string = `${targetScore}/${gameConfigScore}`;
				this.scoreTween = null;
			})
			.start();
	}

	winShow(text:string, score:number):void {
		const node = this.winLabel.node.parent;
		this.winLabel.string = text;
		this.winScoreLabel.string = `ОЧКИ: ${score}`;
		node.active = true;
		node.opacity = 0;
		node.setScale(0.8);
		cc.tween(node)
			.to(0.2, { opacity: 255 })
			.start();
		cc.tween(node)
			.to(0.35, { scale: 1 }, { easing: "backOut" })
			.start();
	}

	onClickRestart():void {
		cc.systemEvent.emit(GameEvents.RestartGame);
	}
}