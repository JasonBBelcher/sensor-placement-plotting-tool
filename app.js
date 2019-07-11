var panelJSON = {
  bgimage: "",
  datasource: "Influx",
  gridPos: {
    h: 16,
    w: 24,
    x: 0,
    y: 0
  },
  height: "600px",
  hideTimeOverride: false,
  id: 2,
  links: [],
  sensors: [],
  series: [],
  seriesList: [],
  targets: [
    {
      alias: "$tag_asset",
      groupBy: [
        {
          params: ["15m"],
          type: "time"
        },
        {
          params: ["asset"],
          type: "tag"
        },
        {
          params: ["previous"],
          type: "fill"
        }
      ],
      measurement: "measurements",
      orderByTime: "ASC",
      policy: "180d",
      refId: "A",
      resultFormat: "time_series",
      select: [
        [
          {
            params: ["temperature"],
            type: "field"
          },
          {
            params: [],
            type: "last"
          },
          {
            params: ["3"],
            type: "moving_average"
          },
          {
            params: [" * 9 / 5 + 32"],
            type: "math"
          }
        ]
      ],
      tags: [
        {
          key: "site",
          operator: "=~",
          value: "/^$siteTag$/"
        }
      ]
    },
    {
      alias: "$tag_asset",
      groupBy: [
        {
          params: ["asset"],
          type: "tag"
        }
      ],
      measurement: "metrics.gateway",
      orderByTime: "ASC",
      policy: "180d",
      refId: "B",
      resultFormat: "time_series",
      select: [
        [
          {
            params: ["status"],
            type: "field"
          }
        ]
      ],
      tags: [
        {
          key: "site",
          operator: "=~",
          value: "/^$siteTag$/"
        }
      ]
    }
  ],
  timeFrom: null,
  title: "Warehouse (Current)",
  transparent: false,
  type: "grafana-floorplan-panel",
  width: "1800"
};

var sensorObj = {
  link_hover: "",
  link_url:
    "https://dashboard-amc.cumberland.cloud/d/AOIypq1ik/sensor-status?orgId=1&var-sensorName=",
  name: "",
  rotation: 0,
  shape: "square",
  size: 10,
  thold1: -11.5,
  thold2: -10,
  thold3: 0,
  thold4: 1.5,
  valueColors: {
    default: {
      bgcolor: "#1f78c1",
      bordercolor: "#1f78c1",
      fontcolor: "#FFFFFF"
    },
    noData: {
      bgcolor: "#888888",
      bordercolor: "#888888",
      fontcolor: "#FFFFFF"
    },
    thresholdFour: {
      bgcolor: "#e24d42",
      bordercolor: "#e24d42",
      fontcolor: "#FFFFFF"
    },
    thresholdOne: {
      bgcolor: "rgb(49, 175, 161)",
      bordercolor: "rgb(49, 175, 161)",
      fontcolor: "#FFFFFF"
    },
    thresholdThree: {
      bgcolor: "#e5ac0e",
      bordercolor: "#e5ac0e",
      fontcolor: "#FFFFFF"
    },
    thresholdTwo: {
      bgcolor: "#508642",
      bordercolor: "#508642",
      fontcolor: "#FFFFFF"
    }
  },
  valueDisplay: "$1 °F",
  valueRegExp: "([\\-]?[0-9]*(\\.[0-9]{0,2})?)",
  xlocation: 300,
  ylocation: 400
};

var canvas = document.createElement("canvas");
var input = document.getElementById("textLabel");
var mapImage = document.getElementById("uploadMap");
var fontSizeInput = document.getElementById("fontSize");
var clrBtn = document.getElementById("clrBtn");
var shapeSizeInput = document.getElementById("shapeSize");
var fontPreview = document.getElementById("fontPreview");
var undoBtn = document.getElementById("undo");
var canvasDiv = document.getElementById("canvas-container");
var fileReader = new FileReader();
var lastImgData = localStorage.getItem("map");
var lastPlottingData = localStorage.getItem("plots");
var errorDiv = document.getElementById("errors");
var confirmBox = document.getElementById("confirm");
var textArea = document.getElementById("json");
var site = document.getElementById("site");
var room = document.getElementById("room");
var device = document.getElementById("device");
var tools = document.getElementById("tools");
var tholdLow = document.getElementById("thold-low");
var tholdHigh = document.getElementById("thold-high");
var buildJSONBtn = document.getElementById("buildJSON");
var labelSensorsBtn = document.getElementById("labelAllSensors");
var form = document.getElementById("uploadFloorPlan");
var thold1;
var thold2;
var thold3;
var thold4;

function calculateThresholds() {
  if (isNaN(parseFloat(tholdLow.value)) || isNaN(parseFloat(tholdHigh.value))) {
    errorDisplay(
      "Please fill out both Low/High Thresholds before adding a sensor"
    );
    return;
  } else {
    thold1 = parseFloat(tholdLow.value) - 1.5;
    thold2 = parseFloat(tholdLow.value);
    thold3 = parseFloat(tholdHigh.value);
    thold4 = parseFloat(tholdHigh.value) + 1.5;
  }
}

var body = document.body;
var method = "idf";
input.style.display = "none";

var array = [
  "idf",
  "proposedGateway",
  "installedGateway",
  "remediatedGateway",
  "grafanaSensor",
  "offlineSensor",
  "onlineSensor",
  "tempStation",
  "sensor",
  "textLabel"
];

var selectList = document.createElement("select");
selectList.id = "shapeSelect";
selectList.className = "form-control";
tools.appendChild(selectList);

for (var i = 0; i < array.length; i++) {
  var option = document.createElement("option");
  option.value = array[i];
  option.text = array[i];
  selectList.appendChild(option);
}
selectList.selectedIndex = 0;
canvas.width = 1876;
canvas.height = 600;
var ctx = canvas.getContext("2d");
var image = new Image();

window.onload = function() {
  canvasDiv.appendChild(canvas);

  image.onload = function() {
    drawMap();
    replayState();
    if (JSON.parse(localStorage.getItem("json"))) {
      panelJSON = JSON.parse(localStorage.getItem("json"));
      textArea.innerHTML = JSON.stringify(panelJSON, undefined, 2);
      buildPanelJSON();
    }
  };
  if (lastImgData) {
    image.src = lastImgData;
  } else {
    image.src = "maps/instructions.png";
  }
};

fileReader.onload = function(e) {
  image.src = e.target.result;
};

mapImage.addEventListener("change", function() {
  var file = this.files[0];
  file && fileReader.readAsDataURL(file);
});

let drawing_methods = {
  sqrCount: 0,
  circleCount: 0,
  state: [],
  txt: "",
  width: 30,
  fontSize: 6,
  idf: function(e) {
    e.color = "#3879d6";
    e.size = this.width;
    this.state.push(this.square(e));
  },
  proposedGateway: function(e) {
    e.color = "#ffec00";
    e.size = this.width;
    this.state.push(this.square(e));
  },
  installedGateway: function(e) {
    e.color = "#3dd339";
    e.size = this.width;
    this.state.push(this.square(e));
  },
  remediatedGateway: function(e) {
    e.color = "#ff3333";
    e.size = this.width;
    this.state.push(this.square(e));
  },
  grafanaSensor: function(e) {
    e.color = "#00ff00";
    e.width = "12";
    e.height = "18";
    this.state.push(this.rectangle(e));
  },
  offlineSensor: function(e) {
    e.color = "#ff3333";
    e.size = this.width;
    this.state.push(this.circle(e));
  },
  onlineSensor: function(e) {
    e.color = "#3dd339";
    e.size = this.width;
    this.state.push(this.circle(e));
  },
  tempStation: function(e) {
    e.color = "#b900b3";
    e.size = this.width;
    this.state.push(this.circle(e));
  },
  sensor: function(e) {
    e.color = "#f5a500";
    e.size = this.width;
    this.state.push(this.circle(e));
  },
  textLabel: function(e) {
    if (input.value !== "") {
      e.txt = input.value;
      e.fontSize = this.fontSize;
      this.state.push(this.text(e));
    }
  },
  text: function(e) {
    x = e.offsetX;
    y = e.offsetY;
    this.txt = e.txt;

    ctx.beginPath();
    ctx.fillStyle = "#000000";
    ctx.font = "normal " + e.fontSize + "pt Arial";
    ctx.fillText(this.txt, x, y);

    return {
      name: "text",
      args: { offsetX: x, offsetY: y, txt: e.txt, fontSize: e.fontSize }
    };
  },

  circle: function(e) {
    // make a circle shape
    this.circleCount += 1;
    var x, y;
    var radius = e.size / 2,
      x = e.offsetX;
    y = e.offsetY;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.closePath();

    calculateThresholds();

    return {
      name: "circle",
      args: { offsetX: x, offsetY: y, color: e.color, size: e.size },
      panel: {
        name: site.value + "_" + room.value + "_" + device.value,
        thold1,
        thold2,
        thold3,
        thold4
      }
    };
  },
  square: function(e) {
    // make a square shape
    this.sqrCount += 1;
    var x, y;
    x = e.offsetX;
    y = e.offsetY;
    ctx.beginPath();
    ctx.fillStyle = e.color;
    ctx.rect(x, y, e.size, e.size);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.closePath();

    calculateThresholds();

    return {
      name: "square",
      args: { offsetX: x, offsetY: y, color: e.color, size: e.size },
      panel: {
        name: site.value + "_" + room.value + "_" + device.value,
        thold1,
        thold2,
        thold3,
        thold4
      }
    };
  },
  rectangle: function(e) {
    // make a square shape
    this.sqrCount += 1;
    var x, y;
    x = e.offsetX;
    y = e.offsetY;
    ctx.beginPath();
    ctx.fillStyle = e.color;
    ctx.rect(x, y, e.height, e.width);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.closePath();

    calculateThresholds();

    return {
      name: "rectangle",
      args: {
        offsetX: x,
        offsetY: y,
        color: e.color,
        height: e.height,
        width: e.width
      },
      panel: {
        name: site.value + "_" + room.value + "_" + device.value,
        thold1,
        thold2,
        thold3,
        thold4
      }
    };
  }
};

var shapeSelect = document.getElementById("shapeSelect");
shapeSelect.addEventListener("change", handleSelectChange);

shapeSizeInput.addEventListener("change", function(e) {
  drawing_methods.width = this.value;
});

fontSizeInput.addEventListener("change", function(e) {
  drawing_methods.fontSize = this.value;
  fontPreview.style.fontSize = this.value + "pt";
});

canvasDiv.addEventListener("dblclick", function(e) {
  drawing_methods[method](e);
  localStorage.setItem("plots", JSON.stringify(drawing_methods.state));
  textInputFocusToggle(method);
  buildPanelJSON();
});

undoBtn.addEventListener("click", undo);
clrBtn.addEventListener("click", clear);

site.addEventListener("change", e => {
  input.value = site.value + "_" + room.value + "_" + device.value;
});

room.addEventListener("change", e => {
  input.value = site.value + "_" + room.value + "_" + device.value;
});

device.addEventListener("change", e => {
  input.value = site.value + "_" + room.value + "_" + device.value;
});
buildJSONBtn.addEventListener("click", buildPanelJSON);
labelSensorsBtn.addEventListener("click", printLabels);

form.addEventListener("submit", uploadMap);

function uploadMap(e) {
  e.preventDefault();

  //  insert an express multer upload endpoint
  url = `<insert url here>`;
  const formData = new FormData();
  formData.append("img", mapImage.files[0]);

  return fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    redirect: "follow",
    referrer: "no-referrer",
    body: formData
  })
    .then(r => {
      return r.json();
    })
    .then(data => {
      if (data) {
        panelJSON.bgimage = data[0].url;

        localStorage.setItem("json", JSON.stringify(panelJSON, undefined, 2));
        textArea.innerHTML = JSON.stringify(panelJSON, undefined, 2);
        confirmBoxDisplay(
          "Image recieved. Image link will be appended to JSON."
        );

        return;
      }
    })
    .catch(function(e) {
      errorDisplay("Upload failed. Choose a file and try again.");
    });
}

function handleSelectChange(event) {
  var selectElement = event.target;
  var value = selectElement.value;
  method = value;
  if (method === "textLabel") {
    input.style.display = "";
    input.focus();
    input.value = site.value + "_" + room.value + "_" + device.value;
  } else {
    input.style.display = "none";
  }
}

function textInputFocusToggle(method) {
  if (method === "textLabel") {
    input.focus();
  }
}

function replayState() {
  if (lastPlottingData) {
    drawing_methods.circleCount = 0;
    drawing_methods.sqrCount = 0;
    drawing_methods.state = JSON.parse(lastPlottingData);
    drawing_methods.state.forEach(function(snapshot, i) {
      drawing_methods[snapshot.name](snapshot.args);
    });
  } else {
    drawing_methods.circleCount = 0;
    drawing_methods.sqrCount = 0;
    drawing_methods.state.forEach(function(snapshot, i) {
      drawing_methods[snapshot.name](snapshot.args);
    });
  }
}

function drawMap() {
  ctx.clearRect(
    canvas.width / 2 - canvas.width / 2,
    canvas.width / 2 - canvas.width / 2,
    canvas.width,
    canvas.height
  );
  localStorage.setItem("map", image.src);
  ctx.drawImage(
    image,
    canvas.width / 2 - canvas.width / 2,
    canvas.height / 2 - canvas.height / 2
  );
}

function clear() {
  drawing_methods.circleCount = 0;
  drawing_methods.sqrCount = 0;
  drawing_methods.state = [];
  lastPlottingData = "";
  panelJSON.sensors = [];
  panelJSON.bgimage = "";
  localStorage.setItem("json", JSON.stringify(panelJSON, undefined, 2));
  textArea.innerHTML = "";
  drawMap();
  replayState();
}

function undo() {
  if (drawing_methods.circleCount > 0) {
    drawing_methods.circleCount -= 1;
  }
  if (drawing_methods.sqrCount > 0) {
    drawing_methods.sqrCount -= 1;
  }

  drawing_methods.state.pop();
  lastPlottingData = localStorage.setItem(
    "plots",
    JSON.stringify(drawing_methods.state)
  );
  drawMap();
  replayState();
  buildPanelJSON();
}

function buildPanelJSON() {
  var arr = [];

  if (JSON.parse(localStorage.getItem("json"))) {
    panelJSON = JSON.parse(localStorage.getItem("json"));
  }

  var plots = JSON.parse(localStorage.getItem("plots"));

  if (plots !== null) {
    plots.forEach(shape => {
      if (shape.name !== "text") {
        var newSensor = Object.assign({}, sensorObj);
        newSensor.xlocation = shape.args.offsetX;
        newSensor.ylocation = shape.args.offsetY;
        newSensor.name = shape.panel.name;
        newSensor.link_hover = shape.panel.name;
        newSensor.link_url += shape.panel.name;
        newSensor.thold1 = shape.panel.thold1;
        newSensor.thold2 = shape.panel.thold2;
        newSensor.thold3 = shape.panel.thold3;
        newSensor.thold4 = shape.panel.thold4;

        arr.push(newSensor);
      }
    });

    panelJSON.sensors = arr;
    localStorage.setItem("json", JSON.stringify(panelJSON, undefined, 2));

    textArea.innerHTML = JSON.stringify(panelJSON, undefined, 2);
  }
}

function printLabels() {
  var plots = JSON.parse(localStorage.getItem("plots"));
  plots.forEach(shape => {
    if (shape.name !== "text") {
      ctx.beginPath();
      ctx.fillStyle = "#000000";
      ctx.font = "normal 5pt Arial";
      ctx.fillText(shape.panel.name, shape.args.offsetX, shape.args.offsetY);
    }
  });
}

document.addEventListener("keydown", function(e) {
  var tag = e.target.tagName.toLowerCase();
  if (e.which === 16 && tag !== "input" && tag !== "textarea") {
    uploadMapAndLink.disabled = false;
    clrBtn.disabled = false;
  }
});

document.addEventListener("keyup", function(e) {
  var tag = e.target.tagName.toLowerCase();
  if (e.which === 16 && tag !== "input" && tag !== "textarea") {
    uploadMapAndLink.disabled = true;
    clrBtn.disabled = true;
  }
});

function copyToClipboard() {
  textArea.select();
  document.execCommand("copy");
}

function errorDisplay(e) {
  errorDiv.style.display = "block";
  errorDiv.innerText = e;
  errorDiv.style.top = window.innerHeight / 3 + "px";
  errorDiv.style.left = window.innerWidth / 2.5 + "px";
  setTimeout(function() {
    errorDiv.innerText = "";
    errorDiv.style.display = "none";
  }, 3000);
}

function confirmBoxDisplay(text) {
  confirmBox.style.display = "block";
  confirmBox.innerText = text;
  confirmBox.style.top = window.innerHeight / 3 + "px";
  confirmBox.style.left = window.innerWidth / 2.5 + "px";
  setTimeout(function() {
    confirmBox.innerText = "";
    confirmBox.style.display = "none";
  }, 3000);
}
