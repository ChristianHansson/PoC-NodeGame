const stdout = process.stdout;
const gameVariables = {
	boardData: {
		x: 20,
		y: 20
	}
};
class InputHandler {
	arrowKeys = {'\u001B\u005B\u0041': "up",'\u001B\u005B\u0043': 'right','\u001B\u005B\u0042': 'down','\u001B\u005B\u0044': 'left'};
	constructor(){
		this.stdin = process.stdin;
		this.inputActions = {
			up: []
		};
	}
	init(){
		this.stdin.setRawMode(true);
		this.stdin.resume();
		this.stdin.setEncoding('utf8')
		this.register();
	}
	close(){
		process.exit();
	}
	register(){
		const self = this;
		this.stdin.on("data", function(key){
			if(self.arrowKeys.hasOwnProperty(key)){
				if(self.hasOwnProperty(self.arrowKeys[key])){
					self[self.arrowKeys[key]]()
				}
			}else if (key === '\u0003'){
				self.close();
			}
		});
	}
}

class GameBoard {
	data = [];
	currentCharacterPositionX = -1;
	currentCharacterPositionY = -1;
	constructor(x,y){
		this.x = x;
		this.y = y;
		this.filUp();
	}
	init(){
		this.createGUI();
	}
	resetPreviousCharacterPosition(){
		// -1 is initial, cannot be set otherwise. Then its enough to only check X value..
		if(this.currentCharacterPositionX > -1){
			this.updatePoint(this.currentCharacterPositionX, this.currentCharacterPositionY);
		}
	}
	checkXColision(newX){
		if(newX < 0){return false;}
		return !!(newX <= this.x - 1);
	}
	moveX(c){
		const newX = (this.currentCharacterPositionX + c);
		if(this.checkXColision(newX)){
			this.setCharacterPosition(newX, this.currentCharacterPositionY);
		}
	}
	checkYColision(newY){
		if(newY < 0){return false;}
		return !!(newY <= this.y - 1);
	}
	moveY(c){
		const newY = (this.currentCharacterPositionY + c);
		if(this.checkYColision(newY)){
			this.setCharacterPosition(this.currentCharacterPositionX, newY);
		}
	}
	setCharacterPosition(x, y){
		this.resetPreviousCharacterPosition();
		this.updatePoint(x, y, "O");
		this.currentCharacterPositionX = x;
		this.currentCharacterPositionY = y;
	}
	filUp(){
		for(let vert = 0; vert < this.y;vert++){
			let a = [];
			for(let horz = 0; horz < this.x; horz++){
				a.push("_")
			}
			this.data.push(a)
		}
	}
	updatePoint(x, y, sym = "_"){
		stdout.cursorTo(x,y);
		stdout.write(sym);
		stdout.cursorTo(this.x, this.y);
	}
	createGUI(){
		console.clear();
		let a, b;
		for(a = 0; a < this.data.length; a++){

			for(b = 0; b < this.data[a].length; b++){
				stdout.write(this.data[a][b])
			}
			stdout.write("\n")
		}
	}
	clearGUI(){
		console.clear();
	}
}
class GameController {
	constructor(inph, gmb, character){
		this.inputHandler = inph;
		this.gameBoard = gmb;
		this.character = character;
		this.inputHandler.init();
		this.gameBoard.init();
		this.attatchInputController();
		this.init()
	}
	init(){
		// set character initial position
		this.gameBoard.setCharacterPosition(0, 0);
	}
	up(){
		this.gameBoard.moveY(-1);
	}
	down(){
		this.gameBoard.moveY(1);
	}
	right(){
		this.gameBoard.moveX(1);
	}
	left(){
		this.gameBoard.moveX(-1);
	}
	attatchInputController(){
		const self = this;
		["up", "down", "right", "left"].forEach((dir, inx) => {
			self.inputHandler[dir] = function(){
				self[dir].call(self);
				self.character.updateCharacterPosition(
					self.gameBoard.currentCharacterPositionX,
					self.gameBoard.currentCharacterPositionY
				)
			};
		});
	}
	declareWinner(ins){
		this.gameBoard.clearGUI();
		console.log(`${ins} WINNS, ${(ins.toLowerCase() === 'enemy') ? 'player' : 'enemy'} is a LOOSER`);
		this.inputHandler.close();
	}
}
class Character {
	constructor(){
		this.posX = -1;
		this.posY = -1;
	}
	startedMoving(){
		return !!(this.posX > -1);
	}
	updateCharacterPosition(x, y){
		this.setX(x);
		this.setY(y);
	}
	setX(x){
		this.posX = x;
	}
	setY(y){
		this.posY = y;
	}
	getCharacterPositions(){
		return {x: this.posX, y: this.posY};
	}
}
class Enemy {
	active = false;
	enemyTraversePath = [];
	constructor(s, player, gameBoard){
		this.x = 0;
		this.y = 0;
		this.tailLength = 5;
		this.spawnedAt = s;
		this.player = player;
		this.gameBoard = gameBoard;
		this.spawn();
	}
	spawn(){
		this.active = this.player.startedMoving();
		return this.active;
	}
	shouldChase(s){
		return !!((s % 2) === 0);
	}
	evaluateEnemyNewPosition(){
		let data = this.player.getCharacterPositions();
		// x
		if(this.x < data.x){
			this.x++;
		}else if(this.x > data.x){
			this.x--;
		}
		// y
		if(this.y < data.y){
			this.y++;
		}else if(this.y > data.y){
			this.y--;
		}
		// If colision Enemy wins LOOSER
		if(this.x === data.x && this.y === data.y){
			gameController.declareWinner('Enemy');
		}
		if(this.enemyTraversePath.length > this.tailLength - 1){
			let shifted = this.enemyTraversePath.shift();
			this.gameBoard.updatePoint(shifted.x, shifted.y);
		}
		this.enemyTraversePath.push({x: this.x, y: this.y});
	}
	chase(s){
		if(this.shouldChase(s)){
			this.evaluateEnemyNewPosition();
			this.gameBoard.updatePoint(this.x, this.y, "X");
			return 200; // decrease chase time by ms every move
		}
		return 0;
	}
}
const player = new Character();
const inputHandler = new InputHandler();
const gameBoard = new GameBoard(gameVariables.boardData.x, gameVariables.boardData.y);
const gameController = new GameController(inputHandler, gameBoard, player);


/* GAMELOOP relzz */
let previousTick = Date.now();
let actualTicks = 0;
let secondsPast = 0;
let enemys = [];
let origMs = 1000;
let tickLengthMs = 1000;
const gameLoop = function(){
	const now = Date.now();
	actualTicks++;
	if (previousTick + tickLengthMs <= now){
		secondsPast++;
		let delta = (now - previousTick) / 1000;
		previousTick = now;
		update(delta);
		// Using array INCASE multiple enemys LOL
		if(enemys.length === 0){
			enemys.push(new Enemy(secondsPast, player, gameBoard));
		}else{
			let dTMS = 0;
			enemys.forEach(en => {
				if(en.spawn()){
					dTMS = en.chase(secondsPast);
				}
			})
			if(tickLengthMs > 200 && dTMS > 0){
				tickLengthMs -= dTMS;
			}
		}
	}
	if (Date.now() - previousTick < tickLengthMs - 16){
		setTimeout(gameLoop);
	}else{
		setImmediate(gameLoop);
	}
};

const update = function(delta){
	aVerySlowFunction(10);
}
const aVerySlowFunction = function(ms){
	let start = Date.now();
	while(Date.now() < start + ms){}
}

gameLoop();