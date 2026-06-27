console.log("TOP LEVEL:");
console.log("  _linkedBinding:", typeof process._linkedBinding);
console.log("  activateUvLoop:", typeof process.activateUvLoop);

// Try loading node_init
try {
  console.log("  loading node_init...");
  var ni = require("electron/js2c/node_init");
  console.log("  node_init OK:", typeof ni);
} catch(x) {
  console.log("  node_init FAIL:", x.message.slice(0,60));
}

// Check if _linkedBinding changed
console.log("AFTER node_init attempt:");
console.log("  _linkedBinding:", typeof process._linkedBinding);
