/************************************
   P E N T A T O N I C   B A L L S
*************************************
Author:		Janosch Alze
Release:	Feb. 2024
File:		main.js
Descr.:		handles game
Version:	1.0
************************************/

/****** initialize variables *******/
var running = false;
var Canvas;
var ArrowsS = [];
var ArrowsG = [];
var Balls = [];
var Background = [];
var notes = [];
const noteList = ["A4", "B4", "C#5", "E5", "F#5", "A5", "B5", "C#6", "E6", "F#6"]; //A Major Pentatonic Scale
var chords = [];
const chordList = [["E3", "D4", "G#4", "B4"], ["B3", "D4", "F#4", "B4"], ["F#3", "A3", "C#4", "F#4"], ["A3", "C#4", "E4", "A4"], ["E3", "G#3", "B3", "E4"], ["D3", "F#4", "A4", "D5"]]; //E7, b, f#, A, E, D (D7, Sp, Tp, T, D, S)
var placeBallsCurrent = 0;
var placeBallsAmount = 5;
var lastFrame;


/************ settings *************/
var r = 50; //ball radius; 20 < r < 100 (small <--> big)
var gType = 3; //type of gravity used; 0 = no gravity, 1 = stationary gravity, 2 = gravity from canvas midpoint to mouse, 3 = gravity from ball to mouse 
var gStat = 3; //value for stationary gravity; 0 < gStat < 10 (weak <--> strong)
var gMouse = 6; //value for intensity of mouse gravity; 0 < gMouse < 10 (weak <--> strong)
var solidTopBottom = true; //solid or permeable tob/bottom borders; true = solid, false = permeable
var solidLeftRight = false; //solid or permeable left/right borders; true = solid, false = permeable
var artMode = true; //activate art mode, where canvas is never reset; true = activated, false deactivated


/********** dev settings ***********/
//Note: arrows are not to scale, both are scaled by the same factor arrowScale, the gravity arrow by a factor of 100 more; this way, you see them clearly
var arrowsS = true; //show speed arrows; true / false
var arrowsG = true; //show gravity arrows; true / false
var arrowScale = 40; //scale arrows; 10 < arrowScale < 50 (short <--> long)
var arrowWidth = 2; //width of arrows in pixels; 1 < arrowWidth < 5 (thin <--> bold)
var levelLength = 220; //gained level per collision to play higher notes; 10 < levelLength < 300 (high notes slowly <--> quickly)
var bpm = 100; //beats per minute; 60 < bpm < 240 (slow <--> fast)
var startAbsSpeed = 7; //sum of the absolute value of the speed in x and y direction for each ball in the beginning; 6
var devMode; //activate developer mode, get exta functions, use settings in main.js; true / false


/********* update settings *********/
function parseBool(value) { //parse Boolean value (for receiving settings)
	if (value === "false" || value == 0 || value == null) {
		return false;
	}
	return true;
}

const get = new URLSearchParams(window.location.search);
devMode = parseBool(get.get("devMode"));
if (!devMode) {
	if (get.size >= 10) { //a minimum of 10 settings will be parsed, otherwise it's a wrong query
		r = parseInt(get.get("r"));
		gType = parseInt(get.get("gType"));
		gStat = parseInt(get.get("gStat"));
		gMouse = parseInt(get.get("gMouse"));
		solidTopBottom = parseBool(get.get("solidTopBottom"));
		solidLeftRight = parseBool(get.get("solidLeftRight"));
		artMode = parseBool(get.get("artMode"));
		arrowsS = parseBool(get.get("arrowsS"));
		arrowsG = parseBool(get.get("arrowsG"));
		arrowScale = parseInt(get.get("arrowScale"));
		arrowWidth = parseInt(get.get("arrowWidth"));
		levelLength = parseInt(get.get("levelLength"));
		bpm = parseInt(get.get("bpm"));
		startAbsSpeed = parseInt(get.get("startAbsSpeed"));
	} else {
		devMode = true;
	}
}

var scaleFactor; //for scaling ball radius, start speed, and static gravity according to window size
if (window.innerHeight < window.innerWidth) { //generate minimum of innerHeight an innerWidth
	scaleFactor = window.innerHeight / 900;
} else {
	scaleFactor = window.innerWidth / 900;
}
r = Math.ceil(r * scaleFactor); //actual radius
startAbsSpeed = Math.ceil(startAbsSpeed * scaleFactor); //actual speed
var noteLength = 60000/bpm; //note length in milliseconds; do not change


/********** base classes ***********/
class Canv { //canvas class for drawing content
	constructor() {
		this.c = document.getElementById("canvas"),
		this.gravity = new vector();
		this.mouse = new vector();
		switch (gType) {
			case 1: //stationary gravity
				this.gravity.y = (gStat / 200) * scaleFactor;
				break;
			case 2: //gravity based on mouse position
			case 3:
				this.gMouse = gMouse;
				break;
			default: //no gravity
				break;
		}
		this.BallsSixths = [0, 0, 0, 0, 0, 0]; //saves number of balls in each Sixth

		this.c.width = window.innerWidth * 0.8;
		this.c.height = window.innerHeight * 0.8;
		this.mid = new vector(this.c.width / 2, this.c.height / 2);
		this.context = this.c.getContext("2d");
	}
	
	start() { //start animation and music
		Tone.start();
		lastFrame = requestAnimationFrame(updateCanvas);
		this.intervalNotes  = setCorrectingInterval(nextNote, noteLength);
		this.intervalChords = setCorrectingInterval(nextChord, noteLength*2);
		this.BallsSixths = detectBallSixths();
	}

	clear() { //clear canvas
		this.context.clearRect(0, 0, this.c.width, this.c.height);
	}

	stop() { //stop animation
		cancelAnimationFrame(lastFrame);
		clearCorrectingInterval(this.intervalNotes);
		clearCorrectingInterval(this.intervalChords);
		document.getElementById("buttons").className = "vis";
		if (artMode) {
			document.getElementById("d_button").className = "button";
		}
	}
}

class Ball { //balls class with collision detection
	constructor(x, y, radius = 20, speed = [0, 0], color = 0, baseNote=0, canvas=Canvas) {
		this.pos = new vector(x,y);
		this.radius = radius;
		this.speed = new vector(speed[0], speed[1]);
		this.gSpeed = new vector(); //only for gravity arrows
		this.color = color; //hsl hue value
		this.context = canvas.context;
		this.level = 0; //exitement level for playing notes
		this.baseNote = baseNote; //note played when hitting wall
	}

	update() { //draw instance
		this.context.fillStyle = "hsl(" + this.color + ", 100%, 60%)";
		this.context.beginPath();
		this.context.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
		this.context.fill();
	};

	newPos() { //calculate updated position
		switch (gType) { //use gravity according to gType
			case 1:
			case 2:
				this.gSpeed.update(Canvas.gravity); //only for gravity arrows
				this.speed.add(Canvas.gravity);
				break;
			case 3:
				var gravity = v_scale(v_sub(Canvas.mouse, this.pos), Canvas.gMouse / (Canvas.c.width * 50));
				this.gSpeed.update(gravity); //only for gravity arrows
				this.speed.add(gravity);
				break;
			default:
				break;
		}

		this.pos.add(this.speed);
	};

	collisionBall(object) { //detect collision with another ball (object)
		var nextDist = v_dist(v_add(this.pos, v_scale(this.speed, 0.7)), v_add(object.pos, v_scale(object.speed, 0.7))); //find distance
		var minDist = this.radius*1.1 + object.radius*1.1;
		if (minDist >= nextDist) { //collision if the sum of the radii is bigger than the distance between the two midpoints
			return v_dist(this.pos, object.pos);
		}
		return 0;
	};

	collisionWall() { //detect collision with wall

		if (solidTopBottom) {
			if (this.pos.y - this.radius*1.1 <= 0) { //hit top border
				return 1;
			}
			if (this.pos.y + this.radius*1.1 >= Canvas.c.height) { //hit bottom border
				return 3;
			}
		} else {
			if (this.pos.y <= 0) { //hit top border
				return 1;
			}
			if (this.pos.y >= Canvas.c.height) { //hit bottom border
				return 3;
			}
		}
		if (solidLeftRight) {
			if (this.pos.x + this.radius*1.1 >= Canvas.c.width) { //hit right border
				return 2;
			}
			if (this.pos.x - this.radius*1.1 <= 0) { //hit left border
				return 4;
			}
		} else {
			if (this.pos.x >= Canvas.c.width) { //hit right border
				return 2;
			}
			if (this.pos.x <= 0) { //hit left border
				return 4;
			}
		}
		
		return 0;
	};

	updateLevel() {
		if(this.level >= 0) {
			this.level = this.level - Math.ceil(this.level * 0.007);
		}
	}
}

class BackgroundPart { //class for background colors (only in devMode)
	constructor(sixth, canvas=Canvas) {
		this.sixth = sixth;
		this.x = Canvas.c.width / 3 * (this.sixth % 3);
		this.y = Canvas.c.height / 2 * (Math.floor(this.sixth / 3) % 2);
		this.width = Canvas.c.width / 3;
		this.height = Canvas.c.height / 2;
		this.color = "rgba(0,0,0,0)"; //transparent
		this.context = canvas.context;
	}

	update() { //draw instance
		this.context.fillStyle = this.color;
		this.context.beginPath();
		this.context.rect(this.x, this.y, this.width, this.height);
		this.context.fill();
	}
}

class Arrow { //arrow class for showing speed and gravity direction and strength
	constructor(ball, color="black") {
		this.ball = ball;
		this.from = this.ball.pos;
		this.color = color;
		this.context = ball.context;
	}

	update(to) { //draw instance from this.from (vector) to to (vector)
		this.from = this.ball.pos;
		this.context.beginPath();
		this.context.moveTo(this.from.x, this.from.y);
		this.context.lineTo(to.x, to.y);
		this.context.lineWidth = arrowWidth;
		this.context.strokeStyle = this.color;
		this.context.stroke();
	}
}


/******* audio functionality *******/
const synth = new Tone.PolySynth(Tone.Synth).toDestination(); //synth from Tone.js
synth.set({
	"volume" : -20,
	"detune": 0,
	"portamento": 0,
	"envelope": {
		"attack": 0.005,
		"attackCurve": "linear",
		"decay": 0.1,
		"decayCurve": "exponential",
		"release": 1,
		"releaseCurve": "exponential",
		"sustain": 0.3
	},
	"oscillator" : {
		"partialCount" : 4,
		"partials" : [1, 0.03, 0.48, 0.06], //soft sound
		"phase" : 0,
		"type" : "custom"
	}
}); //
Tone.Transport.bpm = bpm;

function playNote(note, length) {
	var now = Tone.now();
	synth.triggerAttackRelease(note, length, now, 5);
}

function playChord(chord, length) {
	var now = Tone.now();
	for (let i = 0; i < chord.length; i++) {
		synth.triggerAttack(chord[i], now, 1);
	}
	synth.triggerRelease(chord, now + length);
}

function addNote(ball1, ball2=ball1) { //only one argument used if ball hits wall
	if (ball1 != ball2) {
		level = (ball1.level + ball2.level) / 2; //average level => collision level
		notes.push(Math.floor((level + levelLength/5) / levelLength)); //add note to queque
		ball1.level += levelLength; //both balls receive higher level
		ball2.level += levelLength;
	} else {
		notes.push(Math.floor((ball1.baseNote * levelLength + ball1.level) / levelLength)); //add base note or higher
		ball1.level += levelLength/2; //only receive half a level for collision with wall
	}
}

function nextNote(noteType=0, left=0) {
	if (notes.length != 0) {
		if (noteList.length <= notes[0]) {
			notes.shift();
			nextNote();
			return;
		}
		if (noteType == 0) {
			const weights = [2, 4, 5]; //added weights for randomizer, 40% quarter note, 40% two eighth notes, 20% four sixteenth notes
			const noteTypeRand = Math.floor(Math.random() * 5) + 1;
			if (noteTypeRand > weights[0]) {
				if (noteTypeRand > weights[1]) {
					noteType = 3;
				} else {
					noteType = 2;
				}
			} else {
				noteType = 1;
			}
			left = 2 * (noteType - 1)
		}
		switch (noteType) {
			case 1:
				playNote(noteList[notes[0]], "4n");
				break;
			case 2:
				playNote(noteList[notes[0]], "8n");
				if (left != 0) {
					setTimeout(nextNote, noteLength/2, 2, --left); //recursion to play second note
				}
				break;
			case 3:
				playNote(noteList[notes[0]], "16n");
				if (left != 0) {
					setTimeout(nextNote, noteLength/4, 3, --left); //recursion to play other notes
				}
				break;	
			default:
				break;
		}
		notes.shift(); //remove played note
	}
}

function nextChord() {
	if (chords.length > 1) {
		chords.shift();
	}
	playChord(chordList[chords[0]], noteLength/500);
}


/******* button functionality ******/
//standard buttons after game
function pushRestart() {
	location.reload();
}

function pushSettings() {
	location.assign("settings.html");
}

function pushDownload() { //only in artMode
	var canvasUrl = Canvas.c.toDataURL("image/png");
	const createEl = document.createElement('a');
	createEl.href = canvasUrl;
	createEl.download = "pentatonic-balls-result";
	createEl.click();
	createEl.remove();
}

//developer mode buttons
function pushStart() {
	if (!running) {
		running = true;
		initializePentatonicBalls();
		startPentatonicBalls();
	}
}

function pushContinue() {
	if (!running) {
		Canvas.start();
		running = true;
	}
}

function pushStop() {
	if (running) {
		Canvas.stop();
		running = false;
		notes = [];
		chords = [];
	}
}

function pushNext() {
	if (!running) {
		updateCanvas(true);
	}
}

function pushTest() {
	console.log("test");
}


/********** initiate game **********/
function initializePentatonicBalls() { //initialize objects
	Canvas = new Canv();
	Canvas.c.addEventListener("mousemove", function (e) { //for ball placement and mouse related gravity
		Canvas.mouse.x = e.offsetX;
		Canvas.mouse.y = e.offsetY;
	});
	if (devMode) { //balls created without manual placement in devMode
		Balls[0] = new Ball(100,  100, r, placeBallsSpeed(),  0, 0);
		Balls[1] = new Ball(200,  250, r, placeBallsSpeed(),  50, 1);
		Balls[2] = new Ball(600, 550, r,  placeBallsSpeed(), 100, 2);
		Balls[3] = new Ball(700, 200, r,  placeBallsSpeed(), 150, 3);
		Balls[4] = new Ball(500, 400, r,  placeBallsSpeed(), 200, 4);
		Background[0] = new BackgroundPart(0); //background elements to show Part with most balls
		Background[1] = new BackgroundPart(1);
		Background[2] = new BackgroundPart(2);
		Background[3] = new BackgroundPart(3);
		Background[4] = new BackgroundPart(4);
		Background[5] = new BackgroundPart(5);
		updateCanvasSetup();
		document.getElementById("dev_buttons").className = "vis";
		return;
	}
	placeBallsStart();
}

function startPentatonicBalls() { //initialize more objects and start game
	if (arrowsS) {
		for (let i = 0; i < Balls.length; i++) {
			const ball = Balls[i];
			ArrowsS[i] = new Arrow(ball, "white");
		}
	}
	if (arrowsG) {
		for (let i = 0; i < Balls.length; i++) {
			const ball = Balls[i];
			ArrowsG[i] = new Arrow(ball, "red");
		}
	}

	if (gType == 2) {
		Canvas.c.addEventListener("mousemove", function (e) {
			Canvas.gravity.update(v_scale(v_sub(Canvas.mouse, Canvas.mid), 1 / (Canvas.c.width * Canvas.gMouse)))
		});
		Canvas.c.addEventListener("mouseleave", function () {
			Canvas.gravity.zero();
		});
	}
	if (gType == 3) {
		Canvas.c.addEventListener("mouseleave", function () {
			Canvas.mouse.update(Canvas.mid);
		});
	}

	if (!devMode) {
		var time = Math.floor(Math.random() * 120000) + 120000;  //Generate time: 2 - 4 minutes (in milliseconds)
		alert("Pentatonic Balls will now create a melody for " + Math.floor(time / 600) / 100 + " minutes. Enjoy!");
		setTimeout("Canvas.stop()", time, "test") //stop after generated time
	}
	
	Canvas.start();
	console.info("Created everything!");
}


/********** frame update ***********/
function detectBallSixths() { //returns array with the amount of balls in each sixth of the field
	var BallsSixths = [0, 0, 0, 0, 0, 0];
	for (let i = 0; i < Balls.length; i++) {
		const ball = Balls[i];
		var SixthMod = 0;
		if (ball.pos.y > Canvas.c.height / 2) {
			SixthMod = 3
		}
		if (ball.pos.x > Canvas.c.width / 3) {
			if (ball.pos.x > Canvas.c.width * 2 / 3) {
				BallsSixths[2 + SixthMod] += 1;
				continue;
			}
			BallsSixths[1 + SixthMod] += 1;
			continue;
		}
		BallsSixths[0 + SixthMod] += 1;
	}
	return BallsSixths;
}

function detectMaxSixth(sixths1, sixths2) { //return fiel part with the most balls
	var max = 0;
	var maxIndex = 0;
	for (let i = 0; i < sixths1.length; i++) {
		sum = sixths1[i] + sixths2[i];
		if (sum > max) {
			max = sum;
			maxIndex = i;
		}
	}
	return maxIndex;
}

function updateCanvas(next=false) { //frame update with requestAnimationFrame()
	//chord updates
	var newBallsSixths = detectBallSixths();
	var maxSixth = detectMaxSixth(Canvas.BallsSixths, newBallsSixths);
	Canvas.BallsSixths = newBallsSixths;
	Canvas.BallsSixths[maxSixth] += 0.5;
	if (chords.at(-1) != maxSixth) {
		chords.push(maxSixth);
	}

	//background updates
	if (!artMode) { //clear background when not in artMode
		Canvas.clear();
	}
	
	if (devMode) { //update background Parts to show Max Sixth (for devMode)
		for (let i = 0; i < Background.length; i++) {
			const bg = Background[i];
			if (i == maxSixth) {
				bg.color = "#222222"
			} else {
				bg.color = "rgba(0,0,0,0)"
			}
			bg.update();
		}
	}
	
	//ball updates
	for (let i = 0; i < Balls.length; i++) { //update all balls
		const ball = Balls[i];
		
		//detect collision with other balls
		for (let j = i+1; j < Balls.length; j++) {
			const object = Balls[j];
			collDist = ball.collisionBall(object);
			if (collDist != 0) {
				//calculate resulting speed vectors with fomula of elastic collision
				v1 = ball.speed;
				v2 = object.speed;
				delta_x1_x2 = v_sub(ball.pos,object.pos);
				delta_x2_x1 = v_sub(object.pos,ball.pos);
				v1n = v_sub(v1, v_scale(delta_x1_x2, (v_inner(v_sub(v1,v2),delta_x1_x2)) / (Math.pow(v_norm(delta_x1_x2),2))));
				v2n = v_sub(v2, v_scale(delta_x2_x1, (v_inner(v_sub(v2,v1),delta_x2_x1)) / (Math.pow(v_norm(delta_x2_x1),2))));
				ball.speed = v1n;
				object.speed = v2n;
				minDist = ball.radius + object.radius;
				if (minDist > collDist) { //if balls stuck in each other, move them away along the mid point axis
					deltaDist = minDist - collDist;
					ball.pos.add(v_scale(delta_x1_x2.norm(), deltaDist/2 + 1));
					object.pos.add(v_scale(delta_x2_x1.norm(), deltaDist/2 + 1));
				}
				addNote(ball, object);
			}
		}

		//detect collision with walls
		let collWall = ball.collisionWall();
		switch (collWall) {
			case 1: //hit top border
				if (solidTopBottom) {
					ball.speed.y *= -1; //bounce down
					ball.pos.y = ball.radius*1.1 + 0; //prevent second wall collision
					ball.gSpeed.zero(); //only for gravity arrows
					addNote(ball);
				} else {
					ball.pos.y += Canvas.c.height;  //teleport to other side
				}
				break;
			case 2: //hit right border
				if (solidLeftRight) {
					ball.speed.x *= -1; //bounce left
					ball.pos.x = Canvas.c.width - ball.radius*1.1 - 0;  //prevent second wall collision
					addNote(ball);
				} else {
					ball.pos.x -= Canvas.c.width;  //teleport to other side
				}
				break;
			case 3: //hit bottom border
				if (solidTopBottom) {
					ball.speed.y *= -1; //bounce up
					ball.pos.y = Canvas.c.height - ball.radius*1.1 - 0;  //prevent second wall collision
					ball.gSpeed.zero(); //only for gravity arrows
					addNote(ball);
				} else {
					ball.pos.y -= Canvas.c.height;  //teleport to other side
				}
				break;
			case 4: //hit left border
				if (solidLeftRight) {
					ball.speed.x *= -1; //bounce right
					ball.pos.x = ball.radius*1.1 - 0;  //prevent second wall collision
					addNote(ball);
				} else {
					ball.pos.x += Canvas.c.width;  //teleport to other side
				}
				break;
			default:
				break;
		}

		ball.color = (ball.color + 1) % 360; //circle through hsl wheel
		ball.newPos();
		ball.update();
		ball.updateLevel();
	}

	//arrow updates
	if (arrowsS) {
		for (let i = 0; i < Balls.length; i++) {
			const ball = Balls[i];
			const arrow = ArrowsS[i];
			arrow.update(v_add(ball.pos, v_scale(ball.speed, arrowScale)));
		}
	}
	if (arrowsG) {
		for (let i = 0; i < Balls.length; i++) {
			const ball = Balls[i];
			const arrow = ArrowsG[i];
			arrow.update(v_add(ball.pos, v_scale(ball.gSpeed, arrowScale * 100)));
		}
	}

	if (next === true) { //for dev mode when using next frame
		return;
	}
	lastFrame = requestAnimationFrame(updateCanvas);
}

function updateCanvasSetup() { //smaller frame updater when placing balls
	Canvas.clear(); //clear Canvas
	for (let i = 0; i < Balls.length; i++) { //draw all balls
		const ball = Balls[i];
		ball.update();
	}
}


/*********** place balls ***********/
function placeBallsStart() { //initiate ball placement
	Canvas.c.style.cursor = "none";
	Canvas.c.addEventListener("click", placeBallsClick);
	Canvas.c.addEventListener("mousemove", placeBallsMove);
	placeBallsNew();
}

function placeBallsEnd() { //exit ball placement
	Canvas.c.style.cursor = "auto";
	Canvas.c.removeEventListener("click", placeBallsClick);
	Canvas.c.removeEventListener("mousemove", placeBallsMove);
	startPentatonicBalls();
}

function placeBallsNew() { //place new ball
	if (placeBallsCurrent == placeBallsAmount) {
		placeBallsEnd();
		return;
	}
	Balls.push(new Ball(Canvas.mouse.x,  Canvas.mouse.y, r, placeBallsSpeed(),  placeBallsCurrent * 50, placeBallsCurrent));
}

function placeBallsMove() { //update ball positon when mouse moves
	Balls[placeBallsCurrent].pos.update(Canvas.mouse);
	updateCanvasSetup();
}

function placeBallsClick() { //set ball in place when mouse clicked
	const ball = Balls[placeBallsCurrent];
	for (let i = 0; i < Balls.length - 1; i++) { //detect overlap with other balls
		const object = Balls[i];
		var dist = v_dist(ball.pos, object.pos);
		var minDist = ball.radius*1.1 + object.radius*1.1;
		if (dist < minDist) {
			alert("The balls are too close!");
			return;
		}
	}
	if (ball.collisionWall() != 0) { //detect overlap with wall
		alert("The ball is too close to the wall!");
		return;
	}
	placeBallsCurrent++;
	placeBallsNew();
}

function placeBallsSpeed() { //random speed vector
	absX = Math.floor(Math.random() * startAbsSpeed);
	absY = startAbsSpeed - absX;
	return([absX * Math.pow(-1, Math.floor(Math.random() * 2)), absY * Math.pow(-1, Math.floor(Math.random() * 2))])
}
