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
    if (e.touches && e.touches.length > 0) {
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
    if (!pageElem) return;
    pageElem.style.transform = `scale(${zoomLevel})`;
    if (zoomLabel) zoomLabel.textContent = Math.round(zoomLevel * 100) + "%";
    saveData();
}

function renderPage() {
    if (!pageElem) return;
    pageElem.innerHTML = "";
    if (pageNumber) pageNumber.textContent = `Board ${currentPage + 1} / ${pages.length}`;
    
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
        div.style.position = "absolute"; // Ensure positioning is explicit
        
        let disp = Math.round((note.rotation || 0) % 360);
        if (disp < 0) disp += 360;

        div.innerHTML = `
            <div class="noteText">${note.text}</div>
            <button class="deleteBtn">×</button>
            <div class="resizeHandle"></div>
            <div class="rotateHandle"></div>
            <div class="rotateLabel">${disp}°</div>
        `;

        // Listeners for selection
        div.addEventListener("mousedown", (e) => {
            if (e.target.className.includes("Handle") || e.target.className === "deleteBtn") return;
            selectNote(index);
        });

        div.addEventListener("touchstart", (e) => {
            if (e.target.className.includes("Handle") || e.target.className === "deleteBtn") return;
            selectNote(index);
        }, { passive: true });

        pageElem.appendChild(div);
        enableDrag(div, index);
        enableResize(div, index);
        enableRotate(div, index);
        enableDelete(div, index);
    });

    const leftArrow = document.getElementById("leftArrow");
    const rightArrow = document.getElementById("rightArrow");
    if (leftArrow) leftArrow.classList.toggle("disabled", currentPage === 0);
    if (rightArrow) rightArrow.classList.toggle("disabled", currentPage === pages.length - 1);
    
    updateZoom();
}

function selectNote(index) {
    selectedIndex = index;
    const allNotes = document.querySelectorAll(".noteItem");
    allNotes.forEach(n => n.classList.remove("selected"));
    
    if (allNotes[index]) {
        allNotes[index].classList.add("selected");
        const note = pages[currentPage][index];
        editPanel.style.display = "block";
        noteEditBox.value = note.text;
        colorPicker.value = note.color;
    }
}

// Global click to deselect
document.addEventListener("mousedown", (e) => {
    if (!e.target.closest(".noteItem") && !e.target.closest("#editPanel") && !e.target.closest(".controls")) {
        selectedIndex = null;
        if (editPanel) editPanel.style.display = "none";
        document.querySelectorAll(".noteItem").forEach(n => n.classList.remove("selected"));
    }
});

noteEditBox.oninput = () => {
    if (selectedIndex !== null) {
        pages[currentPage][selectedIndex].text = noteEditBox.value;
        const noteTextElem = document.querySelectorAll(".noteItem")[selectedIndex].querySelector(".noteText");
        if (noteTextElem) noteTextElem.textContent = noteEditBox.value;
        saveData();
    }
};

colorPicker.oninput = () => {
    if (selectedIndex !== null) {
        pages[currentPage][selectedIndex].color = colorPicker.value;
        const noteElem = document.querySelectorAll(".noteItem")[selectedIndex];
        if (noteElem) noteElem.style.backgroundColor = colorPicker.value;
        saveData();
    }
};

document.getElementById("addNoteBtn").onclick = () => {
    pages[currentPage].push({
        text: "New Note", x: 100, y: 100, size: 150, color: "#fff740", rotation: 0
    });
    renderPage();
    selectNote(pages[currentPage].length - 1);
};

document.getElementById("zoomInBtn").onclick = () => { zoomLevel = Math.min(zoomLevel + 0.1, 3); updateZoom(); };
document.getElementById("zoomOutBtn").onclick = () => { zoomLevel = Math.max(zoomLevel - 0.1, 0.25); updateZoom(); };

document.getElementById("rightArrow").onclick = () => {
    if (isFlipping || currentPage >= pages.length - 1) return;
    isFlipping = true;
    pageElem.classList.add("flipping-next");
    setTimeout(() => {
        currentPage++;
        renderPage();
        pageElem.classList.remove("flipping-next");
        isFlipping = false;
    }, 600);
};

document.getElementById("leftArrow").onclick = () => {
    if (isFlipping || currentPage <= 0) return;
    isFlipping = true;
    pageElem.classList.add("flipping-prev");
    setTimeout(() => {
        currentPage--;
        renderPage();
        pageElem.classList.remove("flipping-prev");
        isFlipping = false;
    }, 600);
};

document.getElementById("addPageBtn").onclick = () => { 
    pages.push([]); 
    currentPage = pages.length - 1; 
    renderPage(); 
};

document.getElementById("deletePageBtn").onclick = () => {
    if (pages.length > 1) {
        pages.splice(currentPage, 1);
        currentPage = Math.max(0, currentPage - 1);
        renderPage();
    }
};

function enableDrag(div, index) {
    let ox, oy;

    function startDrag(e) {
        if (e.target.className.includes("Handle") || e.target.className === "deleteBtn") return;
        
        const pos = getEventClient(e);
        ox = pos.pageX - parseFloat(div.style.left || 0);
        oy = pos.pageY - parseFloat(div.style.top || 0);

        function moveDrag(e) {
            if (e.cancelable) e.preventDefault();
            const movePos = getEventClient(e);
            let x = movePos.pageX - ox;
            let y = movePos.pageY - oy;
            
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
        e.preventDefault();

        function moveRotate(e) {
            if (e.cancelable) e.preventDefault();
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
        e.preventDefault();

        function moveResize(e) {
            if (e.cancelable) e.preventDefault();
            const pos = getEventClient(e);
            const rect = div.getBoundingClientRect();
            // Adjust for zoom level to keep resizing accurate
            const newSize = Math.max(60, (pos.x - rect.left) / zoomLevel);
            
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
        selectedIndex = null;
        editPanel.style.display = "none";
        renderPage();
        saveData();
    };
}

document.getElementById("frontBtn").onclick = () => { 
    if (selectedIndex === null) return;
    let n = pages[currentPage].splice(selectedIndex, 1)[0]; 
    pages[currentPage].push(n); 
    renderPage(); 
    selectNote(pages[currentPage].length - 1);
};

document.getElementById("backBtnLayer").onclick = () => { 
    if (selectedIndex === null) return;
    let n = pages[currentPage].splice(selectedIndex, 1)[0]; 
    pages[currentPage].unshift(n); 
    renderPage(); 
    selectNote(0);
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

document.getElementById("downloadBtn").onclick = async () => {
    const page = document.getElementById("page");
    const originalTransform = page.style.transform;
    page.style.transform = "scale(1)";
    document.querySelectorAll(".noteItem").forEach(n => n.classList.remove("selected"));

    try {
        const canvas = await html2canvas(page, { useCORS: true, scale: 2 });
        const link = document.createElement("a");
        link.download = `board-${currentPage + 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (err) {
        console.error("Download failed:", err);
    }
    page.style.transform = originalTransform;
};

// Start the app
window.onload = () => {
    renderPage();
};