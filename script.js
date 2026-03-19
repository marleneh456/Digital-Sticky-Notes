// script.js

// 1. DATA INITIALIZATION
let pages = [[]];
try {
    const saved = localStorage.getItem("stickyPages");
    if (saved) pages = JSON.parse(saved);
} catch (e) {
    console.error("Storage error:", e);
}

let zoomLevel = parseFloat(localStorage.getItem("boardZoom")) || 1;
let currentPage = 0;
let isFlipping = false;
let selectedIndex = null;

const get = (id) => document.getElementById(id);

// 2. CORE UTILITIES
function saveData() {
    localStorage.setItem("stickyPages", JSON.stringify(pages));
    localStorage.setItem("boardZoom", zoomLevel);
}

function getPos(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY, px: t.pageX, py: t.pageY };
}

function updateZoom() {
    const p = get("page");
    if (p) {
        p.style.transform = `scale(${zoomLevel})`;
        const zl = get("zoomLabel");
        if (zl) zl.textContent = Math.round(zoomLevel * 100) + "%";
        saveData();
    }
}

// 3. RENDERING
function renderPage() {
    const container = get("page");
    if (!container) return;

    container.innerHTML = "";
    const num = get("pageNumber");
    if (num) num.textContent = `Board ${currentPage + 1} / ${pages.length}`;

    pages[currentPage].forEach((note, idx) => {
        const div = document.createElement("div");
        div.className = "noteItem";
        if (selectedIndex === idx) div.classList.add("selected");

        div.style.cssText = `
            left: ${note.x}px;
            top: ${note.y}px;
            width: ${note.size}px;
            height: ${note.size}px;
            background-color: ${note.color};
            transform: rotate(${note.rotation || 0}deg);
            position: absolute;
            touch-action: none;
        `;

        let d = Math.round((note.rotation || 0) % 360);
        if (d < 0) d += 360;

        div.innerHTML = `
            <div class="noteContent">${note.text}</div>
            <button class="deleteBtn" style="pointer-events: auto;">×</button>
            <div class="resizeHandle" style="pointer-events: auto;"></div>
            <div class="rotateHandle" style="pointer-events: auto;"></div>
            <div class="rotateLabel">${d}°</div>
        `;

        // Selection Logic (Works for Mobile & Desktop)
        const selectHandler = (e) => {
            if (e.target.classList.contains("deleteBtn") || e.target.className.includes("Handle")) return;
            e.stopPropagation();
            selectNote(idx);
        };
        div.addEventListener("mousedown", selectHandler);
        div.addEventListener("touchstart", selectHandler, { passive: true });

        container.appendChild(div);
        
        // Attach Interaction Behaviors
        setupDrag(div, idx);
        setupResize(div, idx);
        setupRotate(div, idx);
        
        div.querySelector(".deleteBtn").onclick = (e) => {
            e.stopPropagation();
            pages[currentPage].splice(idx, 1);
            selectedIndex = null;
            renderPage();
            saveData();
        };
    });

    // Arrow State
    const la = get("leftArrow");
    const ra = get("rightArrow");
    if (la) la.classList.toggle("disabled", currentPage === 0);
    if (ra) ra.classList.toggle("disabled", currentPage === pages.length - 1);

    updateZoom();
}

function selectNote(idx) {
    selectedIndex = idx;
    document.querySelectorAll(".noteItem").forEach((n, i) => {
        n.classList.toggle("selected", i === idx);
    });
    
    const panel = get("editPanel");
    if (panel) {
        panel.style.display = "block";
        get("noteEditBox").value = pages[currentPage][idx].text;
        get("colorPicker").value = pages[currentPage][idx].color;
    }
}

// 4. INTERACTIONS (DRAG, RESIZE, ROTATE)
function setupDrag(div, idx) {
    const start = (e) => {
        if (e.target.className.includes("Handle") || e.target.className === "deleteBtn") return;
        const p = getPos(e);
        const ox = p.px - parseFloat(div.style.left);
        const oy = p.py - parseFloat(div.style.top);

        const move = (me) => {
            const mp = getPos(me);
            const nx = mp.px - ox;
            const ny = mp.py - oy;
            div.style.left = nx + "px";
            div.style.top = ny + "px";
            pages[currentPage][idx].x = nx;
            pages[currentPage][idx].y = ny;
        };

        const stop = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", stop);
            window.removeEventListener("touchmove", move);
            window.removeEventListener("touchend", stop);
            saveData();
        };

        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", stop);
        window.addEventListener("touchmove", move, { passive: false });
        window.addEventListener("touchend", stop);
    };
    div.addEventListener("mousedown", start);
    div.addEventListener("touchstart", start, { passive: false });
}

function setupResize(div, idx) {
    const h = div.querySelector(".resizeHandle");
    const start = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const move = (me) => {
            const mp = getPos(me);
            const rect = div.getBoundingClientRect();
            const ns = Math.max(60, (mp.x - rect.left) / zoomLevel);
            div.style.width = div.style.height = ns + "px";
            pages[currentPage][idx].size = ns;
        };
        const stop = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("touchmove", move);
            saveData();
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("touchmove", move, { passive: false });
        window.addEventListener("mouseup", stop, { once: true });
        window.addEventListener("touchend", stop, { once: true });
    };
    h.addEventListener("mousedown", start);
    h.addEventListener("touchstart", start, { passive: false });
}

function setupRotate(div, idx) {
    const h = div.querySelector(".rotateHandle");
    const l = div.querySelector(".rotateLabel");
    const start = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const move = (me) => {
            const mp = getPos(me);
            const r = div.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const ang = Math.atan2(mp.y - cy, mp.x - cx) * 180 / Math.PI + 90;
            div.style.transform = `rotate(${ang}deg)`;
            pages[currentPage][idx].rotation = ang;
            let d = Math.round(ang % 360);
            l.innerText = (d < 0 ? d + 360 : d) + "°";
        };
        const stop = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("touchmove", move);
            saveData();
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("touchmove", move, { passive: false });
        window.addEventListener("mouseup", stop, { once: true });
        window.addEventListener("touchend", stop, { once: true });
    };
    h.addEventListener("mousedown", start);
    h.addEventListener("touchstart", start, { passive: false });
}

// 5. GLOBAL INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    
    // UI Navigation Fix
    const clickEvent = ('ontouchstart' in window) ? 'touchstart' : 'click';

    get("addNoteBtn").addEventListener(clickEvent, () => {
        pages[currentPage].push({ text: "New Note", x: 100, y: 100, size: 150, color: "#fff740", rotation: 0 });
        renderPage();
        selectNote(pages[currentPage].length - 1);
    });

    get("leftArrow").addEventListener(clickEvent, (e) => {
        if (currentPage > 0) { currentPage--; renderPage(); }
    });

    get("rightArrow").addEventListener(clickEvent, (e) => {
        if (currentPage < pages.length - 1) { currentPage++; renderPage(); }
    });

    get("zoomInBtn").onclick = () => { zoomLevel = Math.min(zoomLevel + 0.1, 3); updateZoom(); };
    get("zoomOutBtn").onclick = () => { zoomLevel = Math.max(zoomLevel - 0.1, 0.25); updateZoom(); };

    get("noteEditBox").oninput = (e) => {
        if (selectedIndex !== null) {
            pages[currentPage][selectedIndex].text = e.target.value;
            const content = document.querySelectorAll(".noteItem")[selectedIndex].querySelector(".noteContent");
            if (content) content.innerText = e.target.value;
            saveData();
        }
    };

    get("colorPicker").oninput = (e) => {
        if (selectedIndex !== null) {
            pages[currentPage][selectedIndex].color = e.target.value;
            document.querySelectorAll(".noteItem")[selectedIndex].style.backgroundColor = e.target.value;
            saveData();
        }
    };

    get("openBoardBtn").onclick = () => {
        get("coverScreen").style.display = "none";
        get("boardContainer").style.display = "block";
        renderPage();
    };

    get("page").onclick = (e) => {
        if (e.target.id === "page") {
            selectedIndex = null;
            get("editPanel").style.display = "none";
            document.querySelectorAll(".noteItem").forEach(n => n.classList.remove("selected"));
        }
    };

    renderPage();
});