const electron = require("electron");
const { ipcRenderer } = electron;
const app = require("electron").remote;
const dialog = app.dialog;
const moment = require("moment");
const domains = document.querySelector("#domains");
const number = document.querySelector(".number");
const error = document.querySelector(".error");
const completion = document.querySelector(".completion");
const markedText = document.querySelector(".marked-text");
const progressBar = document.querySelector(".progress-bar");
const scrapeButton = document.querySelector(".start-button");
const saveButton = document.querySelector(".save");
const resetButton = document.querySelector(".reset");
const stopButton = document.querySelector(".stop");
const speed = document.querySelector(".speed");
const apikey = document.querySelector(".apikey");
const totalDomain = document.querySelector(".total-domain-number");
const articleError = document.querySelector(".article-error");
const success = document.querySelector(".success");
let numOfErrors = 0;
let arrayLength = 0;
let numOfArticleErrors = 0;
speed.defaultValue = 1000;
apikey.defaultValue = "68cb653c69f14558bd17f0cf0836e21b";

domains.placeholder = domains.placeholder.replace(/\\n/g, "\n");

scrapeButton.addEventListener("click", function (e) {
	arrayLength = 0;
	numOfErrors = 0;
	numOfArticleErrors = 0;
	progressBar.textContent = "0%";
	progressBar.style.width = "0%";
	number.textContent = `Total Number of Domains Completed: 0`;
	error.textContent = `Server Errors: 0`;
	articleError.textContent = `Article Errors: 0`;
	success.textContent = "Successful: 0";
	markedText.classList.remove("marked-text--idle");
	markedText.classList.remove("marked-text--green");
	markedText.classList.remove("marked-text--yellow");
	markedText.classList.add("marked-text--red");
	completion.textContent = "No";
	stopButton.disabled = false;
	stopButton.classList.remove("stop--disabled");
	const domainLis = domains.value;
	const formValues = {
		speed: speed.value,
		apikey: apikey.value,
		domainLis
	};
	ipcRenderer.send("domain:send", formValues);
	progressBar.classList.add("progress-bar-animated");
});

saveButton.addEventListener("click", function (e) {
	dialog.showSaveDialog(
		{
			title: "Choose A Location to Save",
			defaultPath: `*/${moment().format("YYYY-MM-DD-hh-mm")}`,
			filters: [
				{
					name: "XML File(.xml)",
					extensions: [ "xml" ]
				}
			]
		},
		(fileName) => {
			if (fileName) {
				ipcRenderer.send("domain:save", fileName);
			}
		}
	);
});

resetButton.addEventListener("click", function (e) {
	ipcRenderer.send("page:reload");
});

stopButton.addEventListener("click", function (e) {
	if (completion.textContent === "No") {
		completion.textContent = "Stopping";
		ipcRenderer.send("scrape:stop");
		progressBar.classList.remove("progress-bar-animated");
		stopButton.disabled = true;
		stopButton.classList.add("stop--disabled");
	}
});

ipcRenderer.on("list:length", function (e, length) {
	arrayLength = length;
});

ipcRenderer.on("result:number", function (e, numberText) {
	const ratio = Math.ceil(numberText / arrayLength * 100);
	progressBar.textContent = `${ratio}%`;
	progressBar.style.width = `${ratio}%`;
	number.textContent = `Total Number of Domains Completed: ${numberText}`;
	success.textContent = `Successful: ${numberText - numOfErrors - numOfArticleErrors}`;
	if (ratio === 100) {
		progressBar.textContent = "Completed";
		progressBar.classList.remove("progress-bar-animated");
		markedText.classList.remove("marked-text--red");
		markedText.classList.add("marked-text--green");
		completion.textContent = "Yes";
		stopButton.disabled = "yes";
		stopButton.classList.add("stop--disabled");
	}
});

ipcRenderer.on("file:save", function (e) {
	alert("File Saved to Disk Successfully");
});

ipcRenderer.on("domain:number", function (e, totalDomainNumber) {
	totalDomain.textContent = `Total Number of Domains : ${totalDomainNumber}`;
});

ipcRenderer.on("file:notSaved", function (e) {
	alert("File could not be saved. Please try saving again.");
});

ipcRenderer.on("file:empty", function (e) {
	alert("There is no result to save");
});

ipcRenderer.on("list:error", function (e) {
	alert("Domain List is Empty");
});

ipcRenderer.on("result:error", function (e) {
	numOfErrors++;
	error.textContent = `Server Errors: ${numOfErrors}`;
});

ipcRenderer.on("result:error-no-article", function (e) {
	numOfArticleErrors++;
	articleError.textContent = `Article Errors: ${numOfArticleErrors}`;
});

ipcRenderer.on("scrape:stopped", function (e) {
	markedText.classList.remove("marked-text--red");
	markedText.classList.remove("marked-text--green");
	markedText.classList.add("marked-text--yellow");
	completion.textContent = "Stopped";
});
