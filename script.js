// script.js

let pages = JSON.parse(localStorage.getItem("stickyPages")) || [[]];
let zoomLevel = parseFloat(localStorage.getItem("boardZoom")) || 1;
let currentPage = 0;
let isFlipping = false;
let selectedIndex = null;

const getElem = (id) => document.getElementById(id);

function saveData() {
    localStorage.setItem("stickyPages", JSON.stringify(pages));
    localStorage.setItem("boardZoom", zoomLevel);
}

function updateZoom() {
    const pageElem = getElem("page");
    if (!pageElem) return;
    pageElem.style.transform = `scale(${zoomLevel})`;
    getElem("zoomLabel").textContent = Math.round(zoomLevel * 100) + "%";
    saveData();
}

function renderPage() {
    const pageElem = getElem("page");
    if (!pageElem) return;

    pageElem.innerHTML = "";
    getElem("pageNumber").textContent = `Board ${currentPage + 1} / ${pages.length}`;
    
    pages[currentPage].forEach((note, index) => {
        const div = document.createElement("div");
        div.className = "noteItem";
        if (selectedIndex === index) div.classList.add("selected");
        
        div.style.left = note.x + "px";
        div.style.top = note.y + "px";
        div.style.width = note.size + "px";
        div.style.height = note.size + "px";
        div.style.backgroundColor = note.color;
        div.style.transform = `rotate(${note.rotation || 0}deg)`;
        
        let disp = Math.round((note.rotation || 0) % 360);
        if (disp < 0) disp += 360;

        div.innerHTML = `
            <div class="noteContent" style="pointer-events:none;">${note.text}</div>
            <button class="deleteBtn">×</button>
            <div class="resizeHandle"></div>
            <div class="rotateHandle"></div>
            <div class="rotateLabel">${disp}°</div>
        `;

        div.onmousedown = div.ontouchstart = (e) => {
            if (e.target.className.includes("Handle") || e.target.className === "deleteBtn") return;
            selectNote(index);
        };

        pageElem.appendChild(div);
        enableDrag(div, index);
        enableResize(div, index);
        enableRotate(div, index);
        enableDelete(div, index);
    });

    // Update arrow states
    getElem("leftArrow").classList.toggle("disabled", currentPage === 0);
    getElem("rightArrow").classList.toggle("disabled", currentPage === pages.length - 1);
    
    updateZoom();
}

function selectNote(index) {
    selectedIndex = index;
    document.querySelectorAll(".noteItem").forEach((n, i) => {
        n.classList.toggle("selected", i === index);
    });
    
    const note = pages[currentPage][index];
    getElem("editPanel").style.display = "block";
    getElem("noteEditBox").value = note.text;
    getElem("colorPicker").value = note.color;
}

// --- NAVIGATION LOGIC ---
const flipNext = () => {
    if (isFlipping || currentPage >= pages.length - 1) return;
    isFlipping = true;
    getElem("page").classList.add("flipping-next");
    setTimeout(() => {
        currentPage++;
        renderPage();
        getElem("page").classList.remove("flipping-next");
        isFlipping = false;
    }, 600);
};

const flipPrev = () => {
    if (isFlipping || currentPage <= 0) return;
    isFlipping = true;
    getElem("page").classList.add("flipping-prev");
    setTimeout(() => {
        currentPage--;
        renderPage();
        getElem("page").classList.remove("flipping-prev");
        isFlipping = false;
    }, 600);
};

// --- DRAG / RESIZE / ROTATE HELPERS ---
function getEventClient(e) {
    const touch = e.touches && e.touches[0];
    return {
        x: touch ? touch.clientX : e.clientX,
        y: touch ? touch.clientY : e.clientY,
        pageX: touch ? touch.pageX : e.pageX,
        pageY: touch ? touch.pageY : e.pageY
    };
}

function enableDrag(div, index) {
    const start = (e) => {
        if (e.target.className.includes("Handle") || e.target.className === "deleteBtn") return;
        const pos = getEventClient(e);
        const ox = pos.pageX - parseFloat(div.style.left || 0);
        const oy = pos.pageY - parseFloat(div.style.top || 0);

        const move = (me) => {
            if (me.cancelable) me.preventDefault();
            const mPos = getEventClient(me);
            const nx = mPos.pageX - ox;
            const ny = mPos.pageY - oy;
            div.style.left = nx + "px";
            div.style.top = ny + "px";
            pages[currentPage][index].x = nx;
            pages[currentPage][index].y = ny;
        };

        const stop = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);
            document.removeEventListener("touchmove", move);
            document.removeEventListener("touchend", stop);
            saveData();
        };

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);
        document.addEventListener("touchmove", move, { passive: false });
        document.addEventListener("touchend", stop);
    };
    div.addEventListener("mousedown", start);
    div.addEventListener("touchstart", start, { passive: false });
}

function enableResize(div, index) {
    const handle = div.querySelector(".resizeHandle");
    const start = (e) => {
        e.stopPropagation();
        const move = (me) => {
            const mPos = getEventClient(me);
            const rect = div.getBoundingClientRect();
            const newSize = Math.max(60, (mPos.x - rect.left) / zoomLevel);
            div.style.width = div.style.height = newSize + "px";
            pages[currentPage][index].size = newSize;
        };
        const stop = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("touchmove", move);
            saveData();
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("touchmove", move, { passive: false });
        document.addEventListener("mouseup", stop, { once: true });
        document.addEventListener("touchend", stop, { once: true });
    };
    handle.addEventListener("mousedown", start);
    handle.addEventListener("touchstart", start, { passive: false });
}

function enableRotate(div, index) {
    const handle = div.querySelector(".rotateHandle");
    const label = div.querySelector(".rotateLabel");
    const start = (e) => {
        e.stopPropagation();
        const move = (me) => {
            const mPos = getEventClient(me);
            const rect = div.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const angle = Math.atan2(mPos.y - cy, mPos.x - cx) * 180 / Math.PI + 90;
            div.style.transform = `rotate(${angle}deg)`;
            pages[currentPage][index].rotation = angle;
            let d = Math.round(angle % 360);
            label.innerText = (d < 0 ? d + 360 : d) + "°";
        };
        const stop = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("touchmove", move);
            saveData();
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("touchmove", move, { passive: false });
        document.addEventListener("mouseup", stop, { once: true });
        document.addEventListener("touchend", stop, { once: true });
    };
    handle.addEventListener("mousedown", start);
    handle.addEventListener("touchstart", start, { passive: false });
}

function enableDelete(div, index) {
    div.querySelector(".deleteBtn").onclick = (e) => {
        e.stopPropagation();
        pages[currentPage].splice(index, 1);
        selectedIndex = null;
        renderPage();
        saveData();
    };
}

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // Standard Buttons
    getElem("addNoteBtn").onclick = () => {
        pages[currentPage].push({ text: "New Note", x: 100, y: 100, size: 150, color: "#fff740", rotation: 0 });
        renderPage();
    };

    getElem("noteEditBox").oninput = (e) => {
        if (selectedIndex !== null) {
            pages[currentPage][selectedIndex].text = e.target.value;
            // Update only the text div for performance
            const noteDivs = document.querySelectorAll(".noteItem");
            if(noteDivs[selectedIndex]) noteDivs[selectedIndex].querySelector(".noteContent").textContent = e.target.value;
            saveData();
        }
    };

    getElem("colorPicker").oninput = (e) => {
        if (selectedIndex !== null) {
            pages[currentPage][selectedIndex].color = e.target.value;
            const noteDivs = document.querySelectorAll(".noteItem");
            if(noteDivs[selectedIndex]) noteDivs[selectedIndex].style.backgroundColor = e.target.value;
            saveData();
        }
    };

    // Navigation Arrows - Using both click and touchstart for instant response
    const lArrow = getElem("leftArrow");
    const rArrow = getElem("rightArrow");
    
    lArrow.onclick = flipPrev;
    lArrow.ontouchstart = (e) => { e.preventDefault(); flipPrev(); };
    
    rArrow.onclick = flipNext;
    rArrow.ontouchstart = (e) => { e.preventDefault(); flipNext(); };

    getElem("zoomInBtn").onclick = () => { zoomLevel = Math.min(zoomLevel + 0.1, 3); updateZoom(); };
    getElem("zoomOutBtn").onclick = () => { zoomLevel = Math.max(zoomLevel - 0.1, 0.25); updateZoom(); };
    getElem("addPageBtn").onclick = () => { pages.push([]); currentPage = pages.length - 1; renderPage(); };
    
    getElem("openBoardBtn").onclick = () => {
        getElem("coverScreen").style.display = "none";
        getElem("boardContainer").style.display = "block";
        renderPage();
    };

    renderPage();
});