// script.js

let pages = JSON.parse(localStorage.getItem("stickyPages")) || [[]];
let zoomLevel = parseFloat(localStorage.getItem("boardZoom")) || 1;
let currentPage = 0;
let isFlipping = false;
let selectedIndex = null;

const pageElem = document.getElementById("page");
const pageNumber = document.getElementById("pageNumber");
const zoomLabel = document.getElementById("zoomLabel");
const editPanel = document.getElementById("editPanel");
const noteEditBox = document.getElementById("noteEditBox");
const colorPicker = document.getElementById("colorPicker");

// Helper function to extract coordinates for both mouse and touch events
function getEventClient(e) {
    if (e.type.includes('touch')) {
        return {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            pageX: e.touches[0].pageX,
            pageY: e.touches[0].pageY
        };
    }
    return {
        x: e.clientX,
        y: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY
    };
}

function saveData() {
    localStorage.setItem("stickyPages", JSON.stringify(pages));
    localStorage.setItem("boardZoom", zoomLevel);
}

function updateZoom() {
    pageElem.style.transform = `scale(${zoomLevel})`;
    zoomLabel.textContent = Math.round(zoomLevel * 100) + "%";
    saveData();
}

function renderPage() {
    pageElem.innerHTML = "";
    pageNumber.textContent = `Board ${currentPage + 1} / ${pages.length}`;
    
    pages[currentPage].forEach((note, index) => {
        const div = document.createElement("div");
        div.className = "noteItem";
        div.style.left = note.x + "px";
        div.style.top = note.y + "px";
        div.style.width = note.size + "px";
        div.style.height = note.size + "px";
        div.style.backgroundColor = note.color;
        div.style.transform = `rotate(${note.rotation || 0}deg)`;
        
        let disp = Math.round(note.rotation % 360);
        if (disp < 0) disp += 360;

        div.innerHTML = `
            ${note.text}
            <button class="deleteBtn">×</button>
            <div class="resizeHandle"></div>
            <div class="rotateHandle"></div>
            <div class="rotateLabel">${disp}°</div>
        `;

        div.onclick = (e) => {
            e.stopPropagation();
            selectNote(index);
        };

        pageElem.appendChild(div);
        enableDrag(div, index);
        enableResize(div, index);
        enableRotate(div, index);
        enableDelete(div, index);
    });

    document.getElementById("leftArrow").classList.toggle("disabled", currentPage === 0);
    document.getElementById("rightArrow").classList.toggle("disabled", currentPage === pages.length - 1);
    updateZoom();
}

function selectNote(index) {
    document.querySelectorAll(".noteItem").forEach(n => n.classList.remove("selected"));
    selectedIndex = index;
    const note = pages[currentPage][index];
    const noteElements = document.querySelectorAll(".noteItem");
    if(noteElements[index]) noteElements[index].classList.add("selected");
    
    editPanel.style.display = "block";
    noteEditBox.value = note.text;
    colorPicker.value = note.color;
}

pageElem.onclick = () => {
    selectedIndex = null;
    editPanel.style.display = "none";
    document.querySelectorAll(".noteItem").forEach(n => n.classList.remove("selected"));
};

noteEditBox.oninput = () => {
    if (selectedIndex !== null) {
        pages[currentPage][selectedIndex].text = noteEditBox.value;
        renderPage();
        selectNote(selectedIndex);
    }
};

colorPicker.oninput = () => {
    if (selectedIndex !== null) {
        pages[currentPage][selectedIndex].color = colorPicker.value;
        renderPage();
        selectNote(selectedIndex);
    }
};

document.getElementById("addNoteBtn").onclick = () => {
    pages[currentPage].push({
        text: "New Note", x: 50, y: 80, size: 150, color: "#fff740", rotation: 0
    });
    renderPage();
};

document.getElementById("zoomInBtn").onclick = () => { zoomLevel = Math.min(zoomLevel + 0.1, 3); updateZoom(); };
document.getElementById("zoomOutBtn").onclick = () => { zoomLevel = Math.max(zoomLevel - 0.1, 0.25); updateZoom(); };

// --- PAGE NAVIGATION WITH TRANSITIONS ---

document.getElementById("rightArrow").onclick = () => {
    if (isFlipping || currentPage >= pages.length - 1) return;
    isFlipping = true;
    
    // Add CSS class for transition (Slide Out Left)
    pageElem.style.transition = "transform 0.4s ease-in, opacity 0.4s";
    pageElem.style.transform = `scale(${zoomLevel}) translateX(-100%)`;
    pageElem.style.opacity = "0";

    setTimeout(() => {
        currentPage++;
        pageElem.style.transition = "none"; // Reset for positioning
        pageElem.style.transform = `scale(${zoomLevel}) translateX(100%)`;
        renderPage();
        
        // Force Reflow
        pageElem.offsetHeight;

        // Slide In from Right
        pageElem.style.transition = "transform 0.4s ease-out, opacity 0.4s";
        pageElem.style.transform = `scale(${zoomLevel}) translateX(0)`;
        pageElem.style.opacity = "1";
        
        setTimeout(() => { isFlipping = false; }, 400);
    }, 400);
};

document.getElementById("leftArrow").onclick = () => {
    if (isFlipping || currentPage <= 0) return;
    isFlipping = true;

    pageElem.style.transition = "transform 0.4s ease-in, opacity 0.4s";
    pageElem.style.transform = `scale(${zoomLevel}) translateX(100%)`;
    pageElem.style.opacity = "0";

    setTimeout(() => {
        currentPage--;
        pageElem.style.transition = "none";
        pageElem.style.transform = `scale(${zoomLevel}) translateX(-100%)`;
        renderPage();

        pageElem.offsetHeight;

        pageElem.style.transition = "transform 0.4s ease-out, opacity 0.4s";
        pageElem.style.transform = `scale(${zoomLevel}) translateX(0)`;
        pageElem.style.opacity = "1";

        setTimeout(() => { isFlipping = false; }, 400);
    }, 400);
};

document.getElementById("addPageBtn").onclick = () => { pages.push([]); currentPage = pages.length - 1; renderPage(); };
document.getElementById("deletePageBtn").onclick = () => {
    if (pages.length > 1) {
        pages.splice(currentPage, 1);
        currentPage = Math.max(0, currentPage - 1);
        renderPage();
    }
};

// --- TOUCH AND MOUSE HANDLERS ---

function enableDrag(div, index) {
    let ox, oy;

    function startDrag(e) {
        if (e.target.className.includes("Handle") || e.target.className === "deleteBtn") return;
        
        const pos = getEventClient(e);
        ox = pos.pageX - parseFloat(div.style.left || 0);
        oy = pos.pageY - parseFloat(div.style.top || 0);

        function moveDrag(e) {
            if (e.type.includes('touch')) e.preventDefault();
            const movePos = getEventClient(e);
            
            let x = movePos.pageX - ox;
            let y = movePos.pageY - oy;

            // BARRIER LOGIC: Prevent note from being stuck or hidden by top bar
            // Assuming top bar is roughly 60px-80px. We'll clamp Y to minimum 10px.
            const TOP_BARRIER = 10; 
            if (y < TOP_BARRIER) y = TOP_BARRIER;
            if (x < 0) x = 0;

            div.style.left = x + "px"; 
            div.style.top = y + "px";
            pages[currentPage][index].x = x; 
            pages[currentPage][index].y = y;
        }

        function stopDrag() {
            document.removeEventListener("mousemove", moveDrag);
            document.removeEventListener("mouseup", stopDrag);
            document.removeEventListener("touchmove", moveDrag);
            document.removeEventListener("touchend", stopDrag);
            saveData();
        }

        document.addEventListener("mousemove", moveDrag);
        document.addEventListener("mouseup", stopDrag);
        document.addEventListener("touchmove", moveDrag, { passive: false });
        document.addEventListener("touchend", stopDrag);
    }

    div.addEventListener("mousedown", startDrag);
    div.addEventListener("touchstart", startDrag, { passive: false });
}

function enableRotate(div, index) {
    const handle = div.querySelector(".rotateHandle");
    const label = div.querySelector(".rotateLabel");
    
    function startRotate(e) {
        e.stopPropagation();

        function moveRotate(e) {
            if (e.type.includes('touch')) e.preventDefault();
            const pos = getEventClient(e);
            const rect = div.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            
            const angle = Math.atan2(pos.y - cy, pos.x - cx) * 180 / Math.PI + 90;
            div.style.transform = `rotate(${angle}deg)`;
            
            let disp = Math.round(angle % 360);
            if (disp < 0) disp += 360;
            label.innerText = disp + "°";
            pages[currentPage][index].rotation = angle;
        }

        function stopRotate() {
            document.removeEventListener("mousemove", moveRotate);
            document.removeEventListener("mouseup", stopRotate);
            document.removeEventListener("touchmove", moveRotate);
            document.removeEventListener("touchend", stopRotate);
            saveData();
        }

        document.addEventListener("mousemove", moveRotate);
        document.addEventListener("mouseup", stopRotate);
        document.addEventListener("touchmove", moveRotate, { passive: false });
        document.addEventListener("touchend", stopRotate);
    }

    handle.addEventListener("mousedown", startRotate);
    handle.addEventListener("touchstart", startRotate, { passive: false });
}

function enableResize(div, index) {
    const handle = div.querySelector(".resizeHandle");

    function startResize(e) {
        e.stopPropagation();

        function moveResize(e) {
            if (e.type.includes('touch')) e.preventDefault();
            const pos = getEventClient(e);
            const rect = div.getBoundingClientRect();
            const newSize = Math.max(60, pos.x - rect.left);
            
            div.style.width = newSize + "px";
            div.style.height = newSize + "px";
            pages[currentPage][index].size = newSize;
        }

        function stopResize() {
            document.removeEventListener("mousemove", moveResize);
            document.removeEventListener("mouseup", stopResize);
            document.removeEventListener("touchmove", moveResize);
            document.removeEventListener("touchend", stopResize);
            saveData();
            selectNote(index);
        }

        document.addEventListener("mousemove", moveResize);
        document.addEventListener("mouseup", stopResize);
        document.addEventListener("touchmove", moveResize, { passive: false });
        document.addEventListener("touchend", stopResize);
    }

    handle.addEventListener("mousedown", startResize);
    handle.addEventListener("touchstart", startResize, { passive: false });
}

function enableDelete(div, index) {
    div.querySelector(".deleteBtn").onclick = (e) => {
        e.stopPropagation();
        pages[currentPage].splice(index, 1);
        renderPage();
    };
}

// --- BUTTONS ---

document.getElementById("frontBtn").onclick = () => { 
    if(selectedIndex === null) return;
    let n = pages[currentPage].splice(selectedIndex, 1)[0]; 
    pages[currentPage].push(n); 
    renderPage(); 
};

document.getElementById("backBtnLayer").onclick = () => { 
    if(selectedIndex === null) return;
    let n = pages[currentPage].splice(selectedIndex, 1)[0]; 
    pages[currentPage].unshift(n); 
    renderPage(); 
};

document.getElementById("openBoardBtn").onclick = () => {
    document.getElementById("coverScreen").style.opacity = "0";
    setTimeout(() => {
        document.getElementById("coverScreen").style.display = "none";
        document.getElementById("boardContainer").style.display = "block";
        renderPage();
    }, 800);
};

document.getElementById("backBtn").onclick = () => {
    document.getElementById("boardContainer").style.display = "none";
    document.getElementById("coverScreen").style.display = "flex";
    setTimeout(() => { document.getElementById("coverScreen").style.opacity = "1"; }, 50);
};

// =======================
// DOWNLOAD BOARD
// =======================
document.getElementById("downloadBtn").onclick = async () => {
    const page = document.getElementById("page");
    const originalTransform = page.style.transform;
    page.style.transform = "scale(1)";
    document.querySelectorAll(".noteItem").forEach(n => n.classList.remove("selected"));

    try {
        const canvas = await html2canvas(page, {
            useCORS: true,
            scale: 2
        });
        const link = document.createElement("a");
        link.download = `board-${currentPage + 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (err) {
        console.error("Download failed:", err);
    }
    page.style.transform = originalTransform;
};

// Initial Render
renderPage();