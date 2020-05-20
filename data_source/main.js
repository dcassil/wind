var connection = connectWebSocket(),
  wind,
  compass,
  boost,
  indicator,
  connInfo,
  info,
  ui,
  portOffsetX,
  starOffset,
  windDirection = 0,
  compassDirection = 0,
  windwardPoint,
  windOffset = 0,
  avg = [],
  selectedMode = "default",
  currentInstructions = [],
  previousInstructions = [],
  notificationPanel;

const INSTRUCT = {
  START_RACE_SETUP: "startRaceSetup",
  EXIT_RACE_MODE: "exitRaceMode",
  SET_STAR: "setStar",
  SET_PORT: "setPort",
  SET_WINWARD: "setWinward",
  SET_STARTLINE: "setStartLine",
  RACE_SETUP_COMPLETE: "raceSetupComplete",
  NONE: undefined,
};

const MODE = {
  RACE: "race",
  DEFAULT: "default",
};
document.getElementById("back").addEventListener("click", function (e) {
  if (previousInstructions.length > 0) {
    currentInstructions.unshift(previousInstructions.pop());
    setNotificationPanel(currentInstructions[0]);
  } else {
    currentInstructions = [];
    nextInstruction();
  }
});
document.getElementById("set").addEventListener("click", function (e) {
  if (currentInstructions.length === 0) {
    notificationPanel.root.classList.remove("open");
    return;
  }

  switch (currentInstructions[0]) {
    case INSTRUCT.SET_PORT:
      portOffsetX = windDirection;
      nextInstruction();
      console.log("port offset = " + portOffsetX);

      break;
    case INSTRUCT.SET_STAR:
      starOffset = windDirection;
      nextInstruction();
      console.log("star offset = " + starOffset);
      break;
    case INSTRUCT.SET_WINWARD:
      windwardPoint = compassDirection;
      nextInstruction();
      break;
    case INSTRUCT.SET_STARTLINE:
      startLine = getStartLine();
      nextInstruction();
      break;
    case INSTRUCT.RACE_SETUP_COMPLETE:
      nextInstruction();
      break;
    case INSTRUCT.EXIT_RACE_MODE:
      selectedMode = "default";
      nextInstruction();
    default:
      break;
  }
});
document.getElementById("menu").addEventListener("click", function (e) {
  selectedMode = "race";
  currentInstructions = [
    INSTRUCT.SET_PORT,
    INSTRUCT.SET_STAR,
    INSTRUCT.SET_WINWARD,
    INSTRUCT.SET_STARTLINE,
  ];
  console.log("starting race setup");
  notificationPanel.root.classList.add("open");
  setNotificationPanel(currentInstructions[0]);
});
window.addEventListener("resize", function () {
  console.log("resized");
});
indicator = document.getElementById("indicator");
connInfo = document.getElementById("connInfo");
info = document.getElementById("info");

document.addEventListener("DOMContentLoaded", function (event) {
  notificationPanel = {
    info: document.getElementById("npInfo"),
    prompt: document.getElementById("npPrompt"),
    help: document.getElementById("npHelp"),
    root: document.getElementById("np"),
  };
  ui = new UI({ targetId: "plate", parentId: "svgContainer" });

  compass = ui.getPlate("plate");
  ui.createWindicator("port", 15, true);
  ui.createWindicator("starboard", 0);
  ui.createBoostBar("boost");
});

let disconnectWatcher,
  wasDisconnected = false;

connect().then((connection) => {
  connection.onopen = function () {
    indicator.classList.add("connected");
    indicator.classList.remove("connecting");
    connInfo.innerText = "connected";
    console.log("connection opened");
  };
  connection.onerror = function (error) {
    console.log("WebSocket Error ", error);
    indicator.classList.remove("connecting");
    indicator.classList.add("connError");
    connInfo.innerText = "error";
  };
  connection.onclose = function (e) {
    console.log(e);
    indicator.classList.add("connecting");
    connInfo.innerText = "reconnecting";
  };
  connection.onmessage = function (evt) {
    let data = JSON.parse(evt.data);
    // let msgArray = evt.data.split(","), // split message by delimiter into a string array
    //   indicator = msgArray[1]; // the first element in the message array is the ID of the object to update

    if (wasDisconnected) {
      indicator.classList.add("connected");
      indicator.classList.remove("connecting");
      connInfo.innerText = "connected";
      wasDisconnected = false;
    }
    disconnectWatcher && window.clearTimeout(disconnectWatcher);
    disconnectWatcher = window.setTimeout(() => {
      indicator.classList.add("connecting");
      connInfo.innerText = "waiting for network";
      wasDisconnected = true;
    }, 2000);
    var windReading = fromCompassToPercent(data.wind * 1);
    var compassReading = data.magDeg * 1;
    // var dir = windReading.toString();

    info.innerText = data.lat + " ," + data.lng + " ," + data.magDeg;
    if (windDirection !== windReading) {
      avg.push(windReading);
      if (avg.length > 5) {
        avg.shift();
      }
      windDirection =
        avg.reduce((previous, current) => (current += previous)) / avg.length;

      ui.elements.port.update(portOffsetX - windDirection);
      ui.elements.starboard.update(starOffset - windDirection);
    }
    if (compassDirection !== compassReading) {
      ui.elements.plate.update(compassReading);
      compassDirection = compassReading;
    }

    windOffset = windDirection - compassDirection;
  };
});

function connect() {
  return new Promise((resolve, reject) => {
    var connector = window.setInterval(() => {
      try {
        connection = connection || connectWebSocket();
        window.clearInterval(connector);
        console.log("web socket resolving wity:", connection);
        resolve(connection);
      } catch (e) {
        console.log("could not connect to server");
        indicator.classList.add("connecting");
        connInfo.innerText = "Waiting for Network";
      }
    }, 1000);
  });
}

function connectWebSocket() {
  let ws = new ReconnectingWebSocket(
    "ws://" + location.hostname + ":81/",
    ["arduino"],
    { timeoutInterval: 30000 }
  );
  return ws;
}

function fromCompassToPercent(value) {
  if (value < 0) {
    return value + 360;
  }
  if (value > 360) {
    return value - 360;
  }
  return value / 360;
}

function nextInstruction() {
  previousInstructions.push(currentInstructions.shift());

  if (currentInstructions.length > 0) {
    notificationPanel.root.classList.add("open");
  } else {
    notificationPanel.root.classList.remove("open");
    previousInstructions = [];
  }

  setNotificationPanel(currentInstructions[0]);
}

function setNotificationPanel(key) {
  switch (key) {
    case INSTRUCT.SET_PORT:
      notificationPanel.info.innerText = "recording data";
      notificationPanel.prompt.innerText = "Set Port Tack";
      notificationPanel.help.innerText = "head close hauled to port";
      break;
    case INSTRUCT.SET_STAR:
      notificationPanel.info.innerText = "recording data";
      notificationPanel.prompt.innerText = "Set Starboard Tack";
      notificationPanel.help.innerText = "head close hauled to starboard";
      break;
    case INSTRUCT.SET_WINWARD:
      notificationPanel.info.innerText = "recording data";
      notificationPanel.prompt.innerText = "Set Winward Line";
      notificationPanel.help.innerText = "point directly at the winward mark";
      break;
    case INSTRUCT.SET_STARTLINE:
      notificationPanel.info.innerText = "recording data";
      notificationPanel.prompt.innerText = "Set Start Line";
      notificationPanel.help.innerText = "run parallel to the start line";
      break;
    default:
      if (currentInstructions.length === 0) {
        notificationPanel.info.innerText = "";
        notificationPanel.prompt.innerText =
          MODE.RACE && isRaceSetup() ? "WIND - race active" : "WIND";
        notificationPanel.help.innerText = "";
      }
      break;
  }
}

function isRaceSetup() {
  return (
    windwardPoint !== undefined &&
    startLine !== undefined &&
    portOffsetX !== undefined &&
    starOffset !== undefined
  );
}

function getStartLine() {
  // calculate start line by looking at current heading and winward point.
  // startline will be a line running parallel to the boat
  // with the winward point being loosely perpendicular
  return 1;
}
