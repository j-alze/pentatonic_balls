/************************************
   P E N T A T O N I C   B A L L S
*************************************
Author:		Janosch Alze
Release:	Feb. 2024
File:		main.js
Descr.:		handles settings menu
Version:	1.0
************************************/

var advSettings = false;
var devSettings = false;

const settingTypes = ["r", "gType", "gStat", "gMouse", "solidTopBottom", "solidLeftRight", "artMode", "bpm", "arrowsS", "arrowsG", "arrowScale", "arrowWidth", "startAbsSpeed", "levelLength", "devMode"];

const preset1 = {
	r : 40,
	gType : 1,
	gStat : 6,
	gMouse : 5,
	solidTopBottom : "true",
	solidLeftRight : "true",
	artMode : "false",
	bpm : 160,
	arrowsS : "false",
	arrowsG : "false",
	arrowScale : 40,
	arrowWidth : 2,
	startAbsSpeed : 10,
	levelLength : 170,
	devMode : "false"
};

const preset2 = {
	r : 90,
	gType : 0,
	gStat : 3,
	gMouse : 3,
	solidTopBottom : "true",
	solidLeftRight : "true",
	artMode : "false",
	bpm : 210,
	arrowsS : "false",
	arrowsG : "false",
	arrowScale : 40,
	arrowWidth : 2,
	startAbsSpeed : 7,
	levelLength : 35,
	devMode : "false"
};

const preset3 = {
	r : 50,
	gType : 3,
	gStat : 7,
	gMouse : 6,
	solidTopBottom : "true",
	solidLeftRight : "false",
	artMode : "true",
	bpm : 100,
	arrowsS : "false",
	arrowsG : "false",
	arrowScale : 40,
	arrowWidth : 2,
	startAbsSpeed : 7,
	levelLength : 220,
	devMode : "false"
};

const preset4 = {
	r : 40,
	gType : 2,
	gStat : 3,
	gMouse : 5,
	solidTopBottom : "true",
	solidLeftRight : "true",
	artMode : "false",
	bpm : 120,
	arrowsS : "true",
	arrowsG : "true",
	arrowScale : 50,
	arrowWidth : 2,
	startAbsSpeed : 12,
	levelLength : 120,
	devMode : "false"
};

const presets = [preset1, preset2, preset3, preset4];

function presetChange(e) { //change all the form entries according to the selected preset
	var preset = e.value - 1;
	if (preset != -1 && preset < presets.length) { //preset not "custom" and predefined
		settingTypes.forEach(sett => { //iterate over all possible settings
			document.getElementById(sett).value = presets[preset][sett]; //change setting via id
			if (presets[preset][sett] == "true" || presets[preset][sett] == "false") {
				document.getElementById(sett).checked = parseBool(presets[preset][sett]);
			}
		});
		gravityChangeSet(presets[preset]["gType"]); //change visible settings regarding gravity, in case the gType changes
	}
}


function pushAdvanced(e) {
	if (advSettings) {
		e.value = "Off";
		advSettings = false;
		document.getElementById("advSettings").className = "invis";
		document.getElementById("devSettings").className = "invis";
	} else {
		e.value = "On";
		advSettings = true;
		document.getElementById("advSettings").className = "vis";
		if (devSettings) {
			document.getElementById("devSettings").className = "vis";
		}
	}
}

function gravityChange(e) {
	var gType = parseInt(e.value);
	gravityChangeSet(gType);
	document.getElementById("preset").value = 0;
}

function gravityChangeSet(gType) {
	switch (gType) {
		case 1:
			document.getElementById("fieldGStat").className = "vis";
			document.getElementById("fieldGMouse").className = "invis";
			break;
		case 2:
		case 3:
			document.getElementById("fieldGStat").className = "invis";
			document.getElementById("fieldGMouse").className = "vis";
			break;
		case 0:
		default:
			document.getElementById("fieldGStat").className = "invis";
			document.getElementById("fieldGMouse").className = "invis";
			break;
	}
}

function pushOnOff(e) {
	switch (e.value) {
		case "true":
			e.value = "false";
			break;
		case "false":
		default:
			e.value = "true";
			break;
	}
	document.getElementById("preset").value = 0;
}

function pushDev(e) {
	if (devSettings) {
		e.value = "Off";
		devSettings = false;
		document.getElementById("devSettings").className = "invis";
	} else {
		e.value = "On";
		devSettings = true;
		document.getElementById("devSettings").className = "vis";
	}
}

function parseBool(value) {
	if (value === "false" || value == 0 || value == null) {
		return false;
	}
	return true;
}