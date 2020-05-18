class UI {
  constructor(options) {
    this.elements = {};
    this.target = document.getElementById(options.targetId);
    this.parent = document.getElementById(options.parentId);
  }
  createArc(id, size, position, color) {
    this.arcPlate = this.arcPlate || new ArcPlate({ parent: this.parent }).ele;
    this.elements[id] = new Arc({ ele: this.arcPlate, size, position, color });
    return this.elements[id];
  }
  createWindicator(id, position, reverse) {
    this.arcPlate = this.arcPlate || new ArcPlate({ parent: this.parent }).ele;
    this.elements[id] = new Windicator({
      position,
      ele: this.arcPlate,
      reverse,
    });
    return this.elements[id];
  }
  createBoostBar(id) {
    this.elements[id] = new BoostBar({
      ele: document.getElementById("boostBar"),
    });
    return this.elements[id];
  }
  getPlate(id) {
    this.elements[id] = new Plate({
      ele: document.getElementById("compass_g"),
    });
    return this.elements[id];
  }
}

class BoostBar {
  constructor(options) {
    this.parent = options.ele;
    this._render();
  }
  update(value, color) {
    if ((value < 0 && !this.portFavor) || (value > 0 && this.portFavor)) {
      this.ele.setAttribute("transform", "rotate(180 0 1)");
    }
    if (value < 0) {
      this.portFavor = true;
      value = value * -1;
    }
    this.ele.setAttribute("width", value);
    this.ele.setAttribute("fill", color);
  }
  _render() {
    this.ele = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    this.ele.setAttribute("width", 0);
    this.ele.setAttribute("height", 2);
    this.ele.setAttribute("class", "boostBar");

    this.parent.appendChild(this.ele);
  }
}

class Windicator {
  constructor(options) {
    this.position = options.position || 0;
    this.reverse = options.reverse;
    this.parent = options.ele;
    this._updateSegments(this.position);
    this.green = new Arc({
      ...options,
      ...this.segments.green,
      color: "rgba(0, 255, 0, .5)",
    });
    this.red = new Arc({
      ...options,
      ...this.segments.red,
      color: "rgba(255, 0, 0, .5)",
    });
    this.yellow = new Arc({
      ...options,
      ...this.segments.yellow,
      color: "rgba(255, 255, 0, .5)",
    });
  }
  update(position) {
    this._updateSegments(position);
    this.green.update(this.segments.green.position);
    this.red.update(this.segments.red.position);
    this.yellow.update(this.segments.yellow.position);
  }
  _updateSegments(position) {
    this.segments = {
      green: { position, size: 0.1 },
      red: {
        position: this.reverse ? position + 0.08 : position - 0.08,
        size: 0.1,
      },
      yellow: {
        position: this.reverse ? position - 0.08 : position + 0.08,
        size: 0.1,
      },
    };
  }
}

class ArcPlate {
  constructor(options) {
    this.parent = options.parent;
    this._render();
  }
  _render() {
    this.ele = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.ele.setAttribute("viewBox", "-1 -1 2 2");
    this.ele.setAttribute("id", "arcPlate");
    this.ele.setAttribute("class", "compass");
    this.ele.setAttribute("transform", "rotate(-90)");

    this.parent.appendChild(this.ele);
  }
}

class Arc {
  constructor(options) {
    this.size = options.size || 0;
    this.position = options.position || 0;
    this.parent = options.ele;
    this.color = options.color || "black";
    this.d = this._getPathData();
    this._render();
  }
  update(position) {
    this.position = position;
    this.d = this._getPathData();
    this.ele.setAttribute("d", this.d);
  }
  _render() {
    this.ele = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.ele.setAttribute("d", this.d);
    this.ele.setAttribute("fill", this.color);
    this.ele.setAttribute("fill-opacity", "0.7");
    this.parent.appendChild(this.ele);
  }
  _getPathData() {
    let size = this.size,
      position = this.position;
    const [startX, startY] = getCoordinatesForDeg(position);
    const end = position + size;
    const [endX, endY] = getCoordinatesForDeg(end);
    // if the slice is more than 50%, take the large arc (the long way around)
    const largeArcFlag = size > 0.5 ? 1 : 0;
    // create an array and join it just for code readability
    return [
      `M ${startX} ${startY}`,
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `L 0 0`,
    ].join(" ");
  }
}

class Plate {
  constructor(options) {
    this.color = options.color || "white";
    this.ele = options.ele;
  }
  update(deg) {
    this.ele.setAttribute("transform", `rotate(${-deg}) scale (-1, 1)`);
  }
}

function getCoordinatesForDeg(deg) {
  // let percent = deg / 3.6;
  let percent = deg;

  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
}

function toCompassValue(value) {
  if (value < 0) {
    return value + 360;
  }
  if (value > 360) {
    return value - 360;
  }
  return value;
}
