const el = document.getElementById("time");

function tick() {
  el.textContent = new Date().toLocaleTimeString();
}

tick();
setInterval(tick, 1000);
