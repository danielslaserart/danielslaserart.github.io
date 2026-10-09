(()=>{"use strict";
const root=document.getElementById("electronics");if(!root)return;
const tabs=[...root.querySelectorAll("[data-electronics-tab]")],panels=[...root.querySelectorAll("[data-electronics-panel]")];
function show(key){tabs.forEach(b=>{const active=b.dataset.electronicsTab===key;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active))});panels.forEach(p=>p.hidden=p.dataset.electronicsPanel!==key)}
tabs.forEach(b=>b.addEventListener("click",()=>show(b.dataset.electronicsTab)));
show("battery");
})();