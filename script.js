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
let selectedIndex = null;

const get = (id) => document.getElementById(id);

const menuToggle = document.getElementById("menu-toggle");
const topBar = document.querySelector(".topBar");

// START CLOSED
topBar.classList.add("collapsed");

menuToggle.onclick = () => {
    menuToggle.classList.toggle("open");
    topBar.classList.toggle("collapsed");
};

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

        const selectHandler = (e) => {
            if (e.target.classList.contains("deleteBtn") || e.target.className.includes("Handle")) return;
            e.stopPropagation();
            selectNote(idx);
        };
        div.addEventListener("mousedown", selectHandler);
        div.addEventListener("touchstart", selectHandler, { passive: true });

        container.appendChild(div);
        
        setupDrag(div, idx);
        setupResize(div, idx);
        setupRotate(div, idx);
        
        const dBtn = div.querySelector(".deleteBtn");
        if(dBtn) {
            dBtn.onclick = (e) => {
                e.stopPropagation();
                pages[currentPage].splice(idx, 1);
                selectedIndex = null;
                renderPage();
                saveData();
            };
        }
    });

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
        const editBox = get("noteEditBox");
        const picker = get("colorPicker");
        if(editBox) editBox.value = pages[currentPage][idx].text;
        if(picker) picker.value = pages[currentPage][idx].color;
    }
}

function setupDrag(div, idx) {
    const page = get("page"); // Get the page element to calculate bounds

    div.addEventListener("pointerdown", (e) => {
        // Prevent dragging if clicking a button or handle
        if (e.target.tagName === "BUTTON" || e.target.className.includes("Handle")) return;
        
        e.stopPropagation();
        selectNote(idx); // Matches your existing selection logic
        div.style.zIndex = 1000; // Bring to front while dragging
        
        let pageRect = page.getBoundingClientRect();
        
        // Calculate offset based on where the mouse grabbed the note
        let offsetX = (e.clientX - pageRect.left) / zoomLevel - pages[currentPage][idx].x;
        let offsetY = (e.clientY - pageRect.top) / zoomLevel - pages[currentPage][idx].y;
        
        div.setPointerCapture(e.pointerId);

        const moveDrag = (me) => {
            let nx = (me.clientX - pageRect.left) / zoomLevel - offsetX;
            let ny = (me.clientY - pageRect.top) / zoomLevel - offsetY;

            // --- REFINED BARRIER LOGIC ---
            const topBar = document.querySelector('.topBar');
            const TOP_BAR_HEIGHT = topBar ? topBar.offsetHeight : 70;
            
            // Calculate where the "safe zone" starts relative to internal zoomed coordinates
            let barrierY = (TOP_BAR_HEIGHT - pageRect.top) / zoomLevel;

            if (ny < barrierY) {
                ny = barrierY; 
            }
            // -----------------------------

            div.style.left = nx + "px"; 
            div.style.top = ny + "px";
            pages[currentPage][idx].x = nx; 
            pages[currentPage][idx].y = ny;
        };

        const endDrag = (me) => { 
            div.style.zIndex = ""; 
            div.releasePointerCapture(me.pointerId);
            div.removeEventListener("pointermove", moveDrag);
            saveData(); 
        };

        div.addEventListener("pointermove", moveDrag);
        div.addEventListener("pointerup", endDrag, {once:true});
    });
}

function setupResize(div, idx) {
    const h = div.querySelector(".resizeHandle");
    if(!h) return;
    const start = (e) => {
        e.preventDefault(); e.stopPropagation();
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
    if(!h) return;
    const start = (e) => {
        e.preventDefault(); e.stopPropagation();
        const move = (me) => {
            const mp = getPos(me);
            const r = div.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const ang = Math.atan2(mp.y - cy, mp.x - cx) * 180 / Math.PI + 90;
            div.style.transform = `rotate(${ang}deg)`;
            pages[currentPage][idx].rotation = ang;
            let d = Math.round(ang % 360);
            if(l) l.innerText = (d < 0 ? d + 360 : d) + "°";
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
    const clickEvent = ('ontouchstart' in window) ? 'touchstart' : 'click';

    // Helper to safely attach events
    const safeBind = (id, event, fn) => {
        const el = get(id);
        if (el) el.addEventListener(event, fn);
    };

    safeBind("addPageBtn", clickEvent, () => {
        pages.push([]);
        currentPage = pages.length - 1;
        renderPage();
        saveData();
    });

    safeBind("deletePageBtn", clickEvent, () => {
        if (pages.length > 1) {
            pages.splice(currentPage, 1);
            currentPage = Math.max(0, currentPage - 1);
            renderPage();
            saveData();
        } else {
            alert("Cannot delete the only board!");
        }
    });

    safeBind("backBtn", clickEvent, () => {
        const container = get("boardContainer");
        const cover = get("coverScreen");
        if(container) container.style.display = "none";
        if(cover) cover.style.display = "flex";
    });

    safeBind("addNoteBtn", clickEvent, () => {
        // Notes spawn at y:100, which should be safely below a 70px top bar
        pages[currentPage].push({ text: "New Note", x: 100, y: 100, size: 150, color: "#fff740", rotation: 0 });
        renderPage();
        selectNote(pages[currentPage].length - 1);
    });

    safeBind("leftArrow", clickEvent, () => {
        if (currentPage > 0) { currentPage--; renderPage(); }
    });

    safeBind("rightArrow", clickEvent, () => {
        if (currentPage < pages.length - 1) { currentPage++; renderPage(); }
    });

    safeBind("zoomInBtn", "click", () => { zoomLevel = Math.min(zoomLevel + 0.1, 3); updateZoom(); });
    safeBind("zoomOutBtn", "click", () => { zoomLevel = Math.max(zoomLevel - 0.1, 0.25); updateZoom(); });

    safeBind("noteEditBox", "input", (e) => {
        if (selectedIndex !== null) {
            pages[currentPage][selectedIndex].text = e.target.value;
            renderPage();
            saveData();
        }
    });

    safeBind("colorPicker", "input", (e) => {
        if (selectedIndex !== null) {
            pages[currentPage][selectedIndex].color = e.target.value;
            renderPage();
            saveData();
        }
    });

    safeBind("openBoardBtn", "click", () => {
        const cover = get("coverScreen");
        const board = get("boardContainer");
        if(cover) cover.style.display = "none";
        if(board) board.style.display = "block";
        renderPage();
    });

    safeBind("page", "click", (e) => {
        if (e.target.id === "page") {
            selectedIndex = null;
            const panel = get("editPanel");
            if(panel) panel.style.display = "none";
            document.querySelectorAll(".noteItem").forEach(n => n.classList.remove("selected"));
        }
    });

    safeBind("downloadBtn", "click", async () => {
        if (typeof html2canvas === "undefined") {
            alert("Download library is still loading...");
            return;
        }
        const page = get("page");
        if(!page) return;
        const originalTransform = page.style.transform;
        page.style.transform = "scale(1)";
        document.querySelectorAll(".noteItem").forEach(n => n.classList.remove("selected"));

        try {
            const canvas = await window.html2canvas(page, { useCORS: true, scale: 2 });
            const link = document.createElement("a");
            link.download = `board-${currentPage + 1}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (err) {
            console.error(err);
        } finally {
            page.style.transform = originalTransform;
        }
    });

// --- LAYER PANEL TOUCH & CLICK SUPPORT ---
const layerActions = {
    front: () => {
        const arr = pages[currentPage];
        const note = arr.splice(selectedIndex, 1)[0];
        arr.push(note);
        selectedIndex = arr.length - 1;
    },
    back: () => {
        const arr = pages[currentPage];
        const note = arr.splice(selectedIndex, 1)[0];
        arr.unshift(note);
        selectedIndex = 0;
    }
};

const bindLayerBtn = (id, actionKey) => {
    const btn = get(id);
    if (!btn) return;

    // Use pointerup for immediate response on touch without "ghost clicks"
    btn.addEventListener("pointerup", (e) => {
        if (selectedIndex === null) return;
        e.preventDefault();
        
        layerActions[actionKey]();
        
        renderPage();
        saveData();
    });
};

bindLayerBtn("frontBtn", "front");
bindLayerBtn("backBtnLayer", "back");
    
    renderPage();
});
