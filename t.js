try {
  var e = require("electron/js2c/browser_init");
  console.log("browser_init keys:", Object.keys(e).slice(0,10));
} catch(x) {
  console.log("browser_init error:", x.message);
}
try {
  var e2 = require("electron/js2c/node_init");  
  console.log("node_init keys:", Object.keys(e2).slice(0,10));
} catch(x) {
  console.log("node_init error:", x.message);
}
