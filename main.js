"use strict";

const electron = require("electron");
const { app, BrowserWindow, Menu, ipcMain } = electron;
const url = require("url");
const path = require("path");
const axios = require("axios");
const fs = require("fs");

require("electron-reload")(__dirname, {
	electron: path.join(__dirname, "node_modules", ".bin", "electron.cmd")
});

let mainWindow;
let addWindow;
let domainList;
let resultsArr = [];
let apikey;
let idx = 0;
let timeOutIds = [];
let speed;

//Listen for the app to be ready

app.on("ready", function () {
	//create new window
	mainWindow = new BrowserWindow({
		width: 1100,
		height: 850,
		webPreferences: {
			nodeIntegration: true,
			nodeIntegrationInWorker: true
		}
	});
	//Load html into window
	mainWindow.loadURL(
		url.format({
			pathname: path.join(__dirname, "mainWindow.html"),
			protocol: "file:",
			slashes: true
		})
	);
	//Quit app when closed
	mainWindow.on("closed", function () {
		app.quit();
	});

	//Build menu from template
	const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
	//Insert the menu
	Menu.setApplicationMenu(mainMenu);
});

//Handle add window

function createAddWindow () {
	//create new window
	addWindow = new BrowserWindow({
		width: 300,
		height: 200,
		title: "Add Shopping List Item",
		webPreferences: {
			nodeIntegration: true
		}
	});
	//Load html into window
	addWindow.loadURL(
		url.format({
			pathname: path.join(__dirname, "addWindow.html"),
			protocol: "file:",
			slashes: true
		})
	);
	//Garbage Collection handle
	addWindow.on("close", function () {
		addWindow = null;
	});
}

//Catch item:add

ipcMain.on("item:add", function (e, item) {
	mainWindow.webContents.send("item:add", item);
	addWindow.close();
});

ipcMain.on("domain:send", function (e, formValues) {
	idx = 0;
	speed = formValues.speed;
	apikey = formValues.apikey;
	domainList = formValues.domainLis;
	if (domainList.length > 0) {
		domainList = domainList.split("\n");
		mainWindow.webContents.send("list:length", domainList.length);
		scrape();
	} else {
		mainWindow.webContents.send("list:error");
	}
});

ipcMain.on("page:reload", function (e) {
	mainWindow.reload();
	stopScraping();
});

ipcMain.on("domain:save", function (e, fileName) {
	if (fileName === undefined) {
		mainWindow.webContents.send("file:notSaved");
		return;
	}

	if (resultsArr.length === 0) {
		mainWindow.webContents.send("file:empty");
		return;
	}

	let data = [];

	data.push("url,category 1 code,category 1 label,category 1 abs relevance, category 1 relevance");

	resultsArr.forEach((cur) => {
		let newStr = `${cur.url}`;
		const list = cur.category_list;
		if (typeof list !== "undefined" && typeof list[0] !== "undefined") {
			newStr = `${newStr},${list[0].code},${list[0].label},${list[0].relevance},${list[0].abs_relevance}`;
		} else {
			newStr = `${newStr},"","","",""`;
		}

		data.push(newStr);
	});

	data = data.join("\n");

	fs.writeFile(fileName, data, function (err) {
		if (err) {
			mainWindow.webContents.send("file:notSaved");
			return;
		} else {
			mainWindow.webContents.send("file:save");
		}
	});
});

ipcMain.on("scrape:stop", function (e) {
	stopScraping();
});

function stopScraping () {
	timeOutIds.forEach((cur) => {
		clearTimeout(cur);
	});
	mainWindow.webContents.send("scrape:stopped");
}

function scrape () {
	resultsArr = [];
	timeOutIds = [];
	mainWindow.webContents.send("domain:number", domainList.length);
	for (let i = 0; i < domainList.length; i++) {
		(function (i) {
			const timeOutId = setTimeout(function () {
				test(i);
			}, speed * i);
			timeOutIds.push(timeOutId);
		})(i);
	}
}

function test (i) {
	axios
		.post(`https://api.meaningcloud.com/deepcategorization-1.0?key=${apikey}&url=${domainList[i]}&model=IAB_2.0_en`)
		.then((res) => {
			const newObj = {
				url: domainList[i],
				category_list: res.data.category_list
			};
			resultsArr.push(newObj);
		})
		.then(() => {
			idx++;
			const numberText = idx;
			mainWindow.webContents.send("result:number", numberText);
			//! remove later
			if (idx === domainList.length) {
				mainWindow.webContents.send("result:itself", resultsArr);
			}
		})
		.catch((e) => {
			console.log(e);
			idx++;
			const numberText = idx;
			mainWindow.webContents.send("result:number", numberText);
			mainWindow.webContents.send("result:error");
		});
}

//Create menu template
const mainMenuTemplate = [
	{
		label: "File",
		submenu: [
			{
				label: "Quit",
				accelerator: process.platform == "darwin" ? "Command+Q" : "Ctrl+Q",
				click () {
					app.quit();
				}
			}
		]
	}
];

// If mac, add empty object to menu

if (process.platform == "darwin") {
	mainMenuTemplate.unshift({});
}

// Add developer tools item if not in prod
if (process.env.NODE_ENV !== "production") {
	mainMenuTemplate.push({
		label: "Developer Tools",
		submenu: [
			{
				label: "Toggle DevTools",
				accelerator: process.platform == "darwin" ? "Command+I" : "Ctrl+I",
				click (item, focusedWindow) {
					focusedWindow.toggleDevTools();
				}
			},
			{
				role: "reload"
			}
		]
	});
}
