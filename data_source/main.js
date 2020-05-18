var connection = connectWebSocket(),
  wind,
  compass,
  boost,
  indicator,
  connInfo,
  info,
  ui,
  portOffsetX = -1,
  starOffset = -1,
  windDirection = 0,
  compassDirection = 0,
  windOffset = 0,
  avg = [];

document.getElementById("port").addEventListener("click", function (e) {
  portOffsetX = windDirection;
  console.log("port offset = " + portOffsetX);
});
document.getElementById("star").addEventListener("click", function (e) {
  starOffset = windDirection;
  console.log("star offset = " + starOffset);
});
window.addEventListener("resize", function () {
  console.log("resized");
});
indicator = document.getElementById("indicator");
connInfo = document.getElementById("connInfo");
info = document.getElementById("info");

document.addEventListener("DOMContentLoaded", function (event) {
  ui = new UI({ targetId: "plate", parentId: "svgContainer" });

  compass = ui.getPlate("plate");
  ui.createWindicator("port", 15, true);
  ui.createWindicator("starboard", 0);
  ui.createBoostBar("boost");
  //TEST CODE
  // window.setInterval(() => {
  //   if (windDirection > 360) {
  //     windDirection = windDirection - 360;
  //   }
  //   windDirection += 10;
  //   let percent = fromCompassToPercent(windDirection);
  //   // ui.elements.plate.update(windDirection);
  //   ui.elements.port.update(percent + 10);
  //   ui.elements.starboard.update(percent * -1);
  //   ui.elements.boost.update(percent - 30, "rgba(255, 0, 0, .8)");
  // }, 100);
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
    var compassReading = fromCompassToPercent(data.deg * 1);
    // var dir = windReading.toString();

    info.innerText = data.lat + " ," + data.lng + " ," + data.deg;
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
