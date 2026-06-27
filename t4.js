var lb = process._linkedBinding;
console.log("type:", typeof lb);
var names = ["electron_browser","electron_common","electron","atom_browser"];
names.forEach(function(n) {
  try {
    var r = lb(n);
    console.log(n, "=>", typeof r, r ? Object.keys(r).slice(0,5) : null);
  } catch(x) {}
});
