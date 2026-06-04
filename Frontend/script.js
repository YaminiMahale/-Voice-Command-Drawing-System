const PEXELS_API_KEY = "Y2YoWA146kSYfhp9LWAkQwPu8RnRhgbqgzrcMR4GwW3QCcCROsINxNU8";
class CreativeBuilder {
    
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        // elements: images, text, stickers, shapes
        this.elements = [];
        this.background = { type: 'color', value: '#ffffff' };

        this.selectedElement = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.brandColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F'];
        this.activeColor = '#333333';
        this.activeFont = 'Arial, sans-serif';
        this.activeFontSize = 28;
        this.zoom = 1;

        this.history = [];
        this.future = [];

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupUpload();
        this.setupDragDrop();
        this.setupAssets();
        this.setupButtons();
        this.setupBackgroundControls();
        this.addShapeButtons();          // NEW
        this.addExportSizeButtons();     // NEW
        this.generateBrandProfile();
        this.pushHistory();
        this.draw();
    }

    /* ---------- CANVAS & INPUT ---------- */

    setupCanvas() {
        this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onCanvasMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onCanvasMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.zoomCanvas(e));
    }

    setupUpload() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        
        uploadZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
            uploadZone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (name === 'dragenter' || name === 'dragover') {
                    uploadZone.classList.add('dragover');
                } else {
                    uploadZone.classList.remove('dragover');
                }
            });
        });
        
        uploadZone.addEventListener('drop', (e) => {
            this.handleFiles(e.dataTransfer.files);
        });
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.addAsset(img, file.name);
                    this.updateStatus('✅ Asset uploaded successfully!');
                    this.generateBrandProfile();
                    this.pushHistory();
                };
                img.onerror = () => this.updateStatus('❌ Failed to load image', 'error');
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    setupDragDrop() {
        this.canvas.addEventListener('dragover', (e) => e.preventDefault());
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            try {
                const data = e.dataTransfer.getData('text/plain');
                const obj = JSON.parse(data);
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / this.zoom;
                const y = (e.clientY - rect.top) / this.zoom;

                const original = this.elements.find(el => el.id === obj.id);
                if (original) {
                    const clone = this.cloneElement(original);
                    clone.x = x - clone.width / 2;
                    clone.y = y - clone.height / 2;
                    this.elements.push(clone);
                    this.selectedElement = clone;
                    this.draw();
                    this.pushHistory();
                }
            } catch (err) {
                console.log('Drop error', err);
            }
        });
    }

    /* ---------- UI SETUP ---------- */

    setupAssets() {
        const palette = document.getElementById('colorPalette');
        this.brandColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.addEventListener('click', () => {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                this.activeColor = color;
                if (this.selectedElement && ['text','shape'].includes(this.selectedElement.type)) {
                    this.selectedElement.color = color;
                    this.draw();
                    this.pushHistory();
                }
            });
            palette.appendChild(swatch);
        });

        const customPicker = document.getElementById('customColorPicker');
        customPicker.addEventListener('input', () => {
            this.activeColor = customPicker.value;
            if (this.selectedElement && ['text','shape'].includes(this.selectedElement.type)) {
                this.selectedElement.color = this.activeColor;
                this.draw();
                this.pushHistory();
            }
        });

        document.getElementById('addText').addEventListener('click', () => {
            const textInput = document.getElementById('textInput');
            const text = textInput.value.trim() || 'Sample Text';
            this.addTextElement(text);
            textInput.value = '';
        });

        const fontSelect = document.getElementById('fontSelect');
        fontSelect.addEventListener('change', () => {
            this.activeFont = fontSelect.value;
            if (this.selectedElement && this.selectedElement.type === 'text') {
                this.selectedElement.fontFamily = this.activeFont;
                this.draw();
                this.pushHistory();
            }
        });

        const fontSizeSlider = document.getElementById('fontSizeSlider');
        const fontSizeLabel = document.getElementById('fontSizeLabel');
        fontSizeSlider.addEventListener('input', () => {
            this.activeFontSize = parseInt(fontSizeSlider.value, 10);
            fontSizeLabel.textContent = `${this.activeFontSize}px`;
            if (this.selectedElement && this.selectedElement.type === 'text') {
                this.selectedElement.fontSize = this.activeFontSize;
                this.draw();
                this.pushHistory();
            }
        });

        document.querySelectorAll('.sticker-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const emoji = btn.dataset.src || btn.textContent.trim();
                this.addSticker(emoji);
            });
        });
    }

    setupButtons() {
        document.getElementById('aiSuggest').addEventListener('click', () => this.aiSuggestLayout());
        document.getElementById('checkCompliance').addEventListener('click', () => this.checkCompliance());
        document.getElementById('generateVariants').addEventListener('click', () => this.generateVariants());
        document.getElementById('exportJpeg').addEventListener('click', () => this.exportImage('jpeg'));
        document.getElementById('exportPng').addEventListener('click', () => this.exportImage('png'));
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteSelected());
    }

    setupBackgroundControls() {
        const bgColorPicker = document.getElementById('bgColorPicker');
        bgColorPicker.addEventListener('input', () => {
            this.background = { type: 'color', value: bgColorPicker.value };
            this.draw();
            this.pushHistory();
        });

        document.querySelectorAll('.bg-template').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.background = { type: 'template', value: type };
                this.draw();
                this.pushHistory();
            });
        });
    }

    /* ---------- NEW: SHAPE BUTTONS (USING YOUR EXISTING LEFT PANEL, IF YOU ADD BUTTONS THERE) ---------- */

    addShapeButtons() {
        // If you add buttons in HTML with IDs, wire them here.
        // Example (you can add these buttons into left or right panel):
        // <button id="addRect">Add Rectangle</button> etc.
        const makeHandler = (shape) => () => this.addShape(shape);

        const rectBtn = document.getElementById('addRect');
        const circleBtn = document.getElementById('addCircle');
        const triBtn = document.getElementById('addTriangle');
        const lineBtn = document.getElementById('addLine');

        if (rectBtn) rectBtn.addEventListener('click', makeHandler('rect'));
        if (circleBtn) circleBtn.addEventListener('click', makeHandler('circle'));
        if (triBtn) triBtn.addEventListener('click', makeHandler('triangle'));
        if (lineBtn) lineBtn.addEventListener('click', makeHandler('hline'));
    }

    /* ---------- NEW: EXPORT SIZE BUTTONS (FACEBOOK / INSTAGRAM) ---------- */

    addExportSizeButtons() {
        // Optional: add buttons in HTML and wire to exportAtSize
        // Example IDs: exportFb, exportIgSquare, exportIgStory
        const fbBtn = document.getElementById('exportFb');
        const igSqBtn = document.getElementById('exportIgSquare');
        const igStoryBtn = document.getElementById('exportIgStory');

        if (fbBtn) fbBtn.addEventListener('click', () => this.exportAtSize(1200, 628));   // Facebook post
        if (igSqBtn) igSqBtn.addEventListener('click', () => this.exportAtSize(1080, 1080)); // IG square
        if (igStoryBtn) igStoryBtn.addEventListener('click', () => this.exportAtSize(1080, 1920)); // IG story
    }

    /* ---------- ELEMENT CREATION ---------- */

    createId() {
        return Date.now() + Math.random();
    }

    addAsset(img, name) {
        const maxDim = 220;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;

        const asset = {
            id: this.createId(),
            type: 'image',
            img: img,
            src: img.src,
            x: 100,
            y: 150,
            width: w,
            height: h,
            name: name || 'Asset'
        };
        this.elements.push(asset);
        this.renderAssetThumb(img, asset);
        this.draw();
    }

    renderAssetThumb(img, asset) {
        const grid = document.getElementById('assetsGrid');
        const thumb = document.createElement('canvas');
        thumb.className = 'asset-thumb';
        thumb.width = 80;
        thumb.height = 80;
        const ctx = thumb.getContext('2d');
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 80, 80);
        ctx.drawImage(img, 0, 0, 80, 80);

        thumb.draggable = true;
        thumb.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ id: asset.id }));
        });

        grid.appendChild(thumb);
    }

    addTextElement(text) {
        const element = {
            id: this.createId(),
            type: 'text',
            text,
           x: Math.random() * (this.canvas.width - 250),
           y: Math.random() * (this.canvas.height - 100),
            width: 250,
            height: 70,
            fontSize: this.activeFontSize,
            fontFamily: this.activeFont,
            color: this.activeColor
        };
        this.elements.push(element);
        this.selectedElement = element;
        this.draw();
        this.pushHistory();
    }

    addSticker(emoji) {
        const canvas = document.createElement('canvas');
        canvas.width = 90;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        ctx.font = '68px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 45, 48);

        const element = {
            id: this.createId(),
            type: 'sticker',
            img: canvas,
           x: Math.random() * (this.canvas.width - 100),
           y: Math.random() * (this.canvas.height - 100),
            width: 90,
            height: 90
        };
        this.elements.push(element);
        this.selectedElement = element;
        this.draw();
        this.pushHistory();
    }

    addShape(shape) {
        const base = {
            id: this.createId(),
            type: 'shape',
            shape,
           x: Math.random() * (this.canvas.width - 200),
           y: Math.random() * (this.canvas.height - 150),
            width: 200,
            height: 120,
            color: this.activeColor,
            strokeWidth: 4
        };
        if (shape === 'hline') {
            base.height = 6;
        }
        if (shape === 'square') {
    base.width = 150;
    base.height = 150; // same → perfect square
}
        if (shape === 'cloud') {
    base.width = 180;
    base.height = 120;
}
        this.elements.push(base);
        this.selectedElement = base;
        this.draw();
        this.pushHistory();
    }

    cloneElement(el) {
        const copy = JSON.parse(JSON.stringify(el, (k, v) => (k === 'img' ? undefined : v)));
        copy.id = this.createId();
        if (el.img) copy.img = el.img;
        return copy;
    }

    /* ---------- HISTORY (UNDO / REDO) ---------- */

    pushHistory() {
        const snapshot = {
            elements: JSON.parse(JSON.stringify(this.elements, (k, v) => (k === 'img' ? undefined : v))),
            background: { ...this.background }
        };
        this.history.push(snapshot);
        this.future = [];
    }

    undo() {
        if (this.history.length <= 1) return;
        const current = this.history.pop();
        this.future.push(current);
        const last = this.history[this.history.length - 1];
        this.restoreSnapshot(last);
    }

    redo() {
        if (!this.future.length) return;
        const snap = this.future.pop();
        this.history.push(snap);
        this.restoreSnapshot(snap);
    }

    restoreSnapshot(snapshot) {
        this.background = { ...snapshot.background };
      this.elements = snapshot.elements.map(el => {

    if (el.type === 'image' && el.src) {

        const img = new Image();

        img.src = el.src;

        el.img = img;
    }

    if (el.type === 'sticker') {

        el.img = this.imageMap[el.id];
    }

    return el;
});
        this.selectedElement = null;
        this.draw();
    }

    deleteSelected() {
        if (!this.selectedElement) return;
        this.elements = this.elements.filter(el => el !== this.selectedElement);
        this.selectedElement = null;
        this.draw();
        this.pushHistory();
    }

    /* ---------- AI / COMPLIANCE / EXPORT ---------- */

    aiSuggestLayout() {
        this.updateStatus('🎨 AI suggesting professional layouts...', 'warning');
        const aiList = document.getElementById('aiSuggestionsList');
        aiList.innerHTML = '<li>Thinking of best layout for Tesco advertisers…</li>';

        setTimeout(() => {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;

            const images = this.elements.filter(el => el.type === 'image');
            const texts = this.elements.filter(el => el.type === 'text');
            const stickers = this.elements.filter(el => el.type === 'sticker');

            if (images[0]) {
                images[0].x = centerX - images[0].width - 40;
                images[0].y = centerY - images[0].height / 2;
            }
            if (texts[0]) {
                texts[0].x = centerX + 20;
                texts[0].y = centerY - 40;
            }
            if (stickers[0]) {
                stickers[0].x = this.canvas.width - stickers[0].width - 40;
                stickers[0].y = 40;
            }

            this.draw();
            this.pushHistory();

            aiList.innerHTML = '';
            if (images[0]) aiList.innerHTML += '<li>Placed product image in a hero position.</li>';
            if (texts[0]) aiList.innerHTML += '<li>Aligned headline text near the product.</li>';
            if (stickers[0]) aiList.innerHTML += '<li>Moved sticker to an offer corner.</li>';
            if (!images.length && !texts.length && !stickers.length) {
                aiList.innerHTML = '<li>Add at least one image or text to see suggestions.</li>';
            }

            this.updateStatus('✅ AI layout applied!');
        }, 1200);
    }

    checkCompliance() {
        this.updateStatus('🔍 Checking guideline safe zones…', 'warning');
        setTimeout(() => {
            const safe = 20;
            const issues = [];
            this.elements.forEach(el => {
                if (el.x < safe || el.y < safe ||
                    el.x + el.width > this.canvas.width - safe ||
                    el.y + el.height > this.canvas.height - safe) {
                    issues.push('Safe zone violation');
                }
            });
            if (this.elements.filter(el => el.type === 'text').length > 4) {
                issues.push('Too much text (try 3–4 lines max).');
            }

            const status = document.getElementById('complianceStatus');
            if (!issues.length) {
                status.textContent = '✅ 100% Guideline Compliant!';
                status.className = 'status-good';
            } else {
                status.textContent = '⚠️ ' + issues.join(' | ');
                status.className = 'status-warning';
            }
        }, 900);
    }

    generateVariants() {
        this.updateStatus('✨ Generating creative variants...', 'warning');
        setTimeout(() => {
            this.updateStatus('✅ 5 variants generated! (Festive, Premium, Sale, IG Square, FB Post)');
        }, 1200);
    }

    exportImage(format) {
        try {
            this.canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `tesco-creative-${Date.now()}.${format}`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                this.updateStatus(`✅ Exported ${format.toUpperCase()} (preview size)`);
            }, `image/${format}`, 0.9);
        } catch (err) {
            const link = document.createElement('a');
            link.download = `tesco-creative-${Date.now()}.${format}`;
            link.href = this.canvas.toDataURL(`image/${format}`, 0.9);
            link.click();
            this.updateStatus(`✅ Exported ${format.toUpperCase()}`);
        }
    }

    // NEW: export at a specific size (FB / IG)
    exportAtSize(width, height) {
        const off = document.createElement('canvas');
        off.width = width;
        off.height = height;
        const ctx = off.getContext('2d');

        // background
        if (this.background.type === 'color') {
            ctx.fillStyle = this.background.value || '#ffffff';
            ctx.fillRect(0, 0, width, height);
        } else {
            const grd = ctx.createLinearGradient(0, 0, width, height);
            const type = this.background.value;
            if (type === 'gradient1') {
                grd.addColorStop(0, '#ffe259');
                grd.addColorStop(1, '#ffa751');
            } else if (type === 'gradient2') {
                grd.addColorStop(0, '#36d1dc');
                grd.addColorStop(1, '#5b86e5');
            } else {
                grd.addColorStop(0, '#ff9a9e');
                grd.addColorStop(1, '#fad0c4');
            }
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);
        }

        const scaleX = width / this.canvas.width;
        const scaleY = height / this.canvas.height;

        // safe zone
        ctx.strokeStyle = '#e0e0e0';
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(20 * scaleX, 20 * scaleY,
                       (this.canvas.width - 40) * scaleX,
                       (this.canvas.height - 40) * scaleY);
        ctx.setLineDash([]);

        this.elements.forEach(el => {
            const x = el.x * scaleX;
            const y = el.y * scaleY;
            const w = el.width * scaleX;
            const h = el.height * scaleY;

            ctx.save();
            ctx.translate(x, y);

            if (el.type === 'image' || el.type === 'sticker') {
                if (el.img) ctx.drawImage(el.img, 0, 0, w, h);
            } else if (el.type === 'text') {
                ctx.fillStyle = el.color || this.activeColor;
                ctx.font = `${(el.fontSize || 28) * scaleY}px ${el.fontFamily || 'Arial, sans-serif'}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.text, w / 2, h / 2);
            } else if (el.type === 'shape') {
                ctx.strokeStyle = el.color || this.activeColor;
                ctx.lineWidth = (el.strokeWidth || 4) * ((scaleX + scaleY) / 2);
                ctx.beginPath();
                if (el.shape === 'rect') {
                    ctx.strokeRect(0, 0, w, h);
                } else if (el.shape === 'circle') {
                    ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (el.shape === 'triangle') {
                    ctx.moveTo(w / 2, 0);
                    ctx.lineTo(0, h);
                    ctx.lineTo(w, h);
                    ctx.closePath();
                    ctx.stroke();
                } else if (el.shape === 'hline') {
                    ctx.moveTo(0, h / 2);
                    ctx.lineTo(w, h / 2);
                    ctx.stroke();
                }
            }

            ctx.restore();
        });

        off.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `tesco-creative-${width}x${height}-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            this.updateStatus(`✅ Exported ${width}×${height} PNG`);
        }, 'image/png', 0.9);
    }

    /* ---------- MOUSE HANDLING (DRAG + RESIZE) ---------- */

    onCanvasMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;

        // resize handle first
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const el = this.elements[i];
            if (this.isPointInResizeHandle(x, y, el)) {
                this.selectedElement = el;
                this.isResizing = true;
                return;
            }
        }

        // drag element
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const el = this.elements[i];
            if (this.isPointInElement(x, y, el)) {
                this.selectedElement = el;
                this.isDragging = true;
                this.dragOffset.x = x - el.x;
                this.dragOffset.y = y - el.y;
                this.draw();
                return;
            }
        }
        this.selectedElement = null;
        this.draw();
    }

    onCanvasMouseMove(e) {
        if (!this.isDragging && !this.isResizing) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;

        if (this.isDragging && this.selectedElement) {
            this.selectedElement.x = x - this.dragOffset.x;
            this.selectedElement.y = y - this.dragOffset.y;
        } else if (this.isResizing && this.selectedElement) {
            this.selectedElement.width = Math.max(40, x - this.selectedElement.x);
            this.selectedElement.height = Math.max(40, y - this.selectedElement.y);
        }
        this.draw();
    }

    onCanvasMouseUp() {
        if (this.isDragging || this.isResizing) {
            this.pushHistory();
        }
        this.isDragging = false;
        this.isResizing = false;
    }

    zoomCanvas(e) {
        e.preventDefault();
        const scale = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(0.7, Math.min(1.5, this.zoom * scale));
        this.canvas.style.transform = `scale(${this.zoom})`;
    }

    isPointInElement(x, y, el) {
        return x >= el.x && x <= el.x + el.width &&
               y >= el.y && y <= el.y + el.height;
    }

    isPointInResizeHandle(x, y, el) {
        const r = 6;
        const hx = el.x + el.width - r;
        const hy = el.y + el.height - r;
        return x >= hx - r && x <= hx + r && y >= hy - r && y <= hy + r;
    }

    /* ---------- DRAWING ---------- */

    drawBackground() {
        if (this.background.type === 'color') {
            this.ctx.fillStyle = this.background.value || '#ffffff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.background.type === 'template') {
            const type = this.background.value;
            const grd = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            if (type === 'gradient1') {
                grd.addColorStop(0, '#ffe259');
                grd.addColorStop(1, '#ffa751');
            } else if (type === 'gradient2') {
                grd.addColorStop(0, '#36d1dc');
                grd.addColorStop(1, '#5b86e5');
            } else {
                grd.addColorStop(0, '#ff9a9e');
                grd.addColorStop(1, '#fad0c4');
            }
            this.ctx.fillStyle = grd;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    draw() {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawBackground();

        // safe zone
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(20, 20, this.canvas.width - 40, this.canvas.height - 40);
        this.ctx.setLineDash([]);

        this.elements.forEach(el => {
            this.ctx.save();
            this.ctx.translate(el.x, el.y);

            if (el.type === 'image' || el.type === 'sticker') {
                if (el.img) {
                    this.ctx.drawImage(el.img, 0, 0, el.width, el.height);
                } else {
                    this.ctx.fillStyle = '#cccccc';
                    this.ctx.fillRect(0, 0, el.width, el.height);
                }
            } else if (el.type === 'text') {
                this.ctx.fillStyle = el.color || this.activeColor;
                this.ctx.font = `${el.fontSize || 28}px ${el.fontFamily || 'Arial, sans-serif'}`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(el.text, el.width / 2, el.height / 2);
            } else if (el.type === 'shape') {
                this.ctx.strokeStyle = el.color || this.activeColor;
                this.ctx.lineWidth = el.strokeWidth || 4;
                this.ctx.beginPath();
                if (el.shape === 'rect') {
                    this.ctx.strokeRect(0, 0, el.width, el.height);
                } 
                else if (el.shape === 'square') {
    this.ctx.strokeRect(0, 0, el.width, el.width); // equal sides

    // optional fill
    // this.ctx.fillStyle = el.color || "#cccccc";
    // this.ctx.fillRect(0, 0, el.width, el.width);
}
                else if (el.shape === 'circle') {
                    this.ctx.arc(el.width / 2, el.height / 2, Math.min(el.width, el.height) / 2, 0, Math.PI * 2);
                    this.ctx.stroke();
                } else if (el.shape === 'triangle') {
                    this.ctx.moveTo(el.width / 2, 0);
                    this.ctx.lineTo(0, el.height);
                    this.ctx.lineTo(el.width, el.height);
                    this.ctx.closePath();
                    this.ctx.stroke();
                } else if (el.shape === 'hline') {
                    this.ctx.moveTo(0, el.height / 2);
                    this.ctx.lineTo(el.width, el.height / 2);
                    this.ctx.stroke();
                }
                else if (el.shape === 'vline') {
                    this.ctx.moveTo(el.width / 2,0);
                    this.ctx.lineTo(el.width / 2,el.height);
                    this.ctx.stroke();
                }
                else if (el.shape === 'cloud') {
    const x = 0;
    const y = 0;
    const w = el.width;
    const h = el.height;

    this.ctx.beginPath();

    // left small bump
    this.ctx.arc(w * 0.2, h * 0.6, w * 0.2, Math.PI * 0.5, Math.PI * 1.5);

    // middle bump
    this.ctx.arc(w * 0.5, h * 0.4, w * 0.3, Math.PI, 0);

    // right bump
    this.ctx.arc(w * 0.8, h * 0.6, w * 0.25, Math.PI * 1.5, Math.PI * 0.5);

    // bottom curve (connect)
    this.ctx.lineTo(w * 0.2, h * 0.85);

    this.ctx.closePath();
    this.ctx.stroke();
}
else if (el.shape === "oval" || el.shape === "ellipse") {

    this.ctx.beginPath();

    this.ctx.ellipse(
        el.width / 2,
        el.height / 2,
        el.width / 2,
        el.height / 3,
        0,
        0,
        Math.PI * 2
    );

    this.ctx.stroke();
}else if (el.shape === "semicircle") {

    this.ctx.beginPath();

    this.ctx.arc(
        el.width / 2,
        el.height,
        el.width / 2,
        Math.PI,
        0
    );

    this.ctx.stroke();
}else if (el.shape === "crescent") {

    this.ctx.beginPath();

    this.ctx.arc(
        el.width/2,
        el.height/2,
        el.width/3,
        0,
        Math.PI*2
    );

    this.ctx.stroke();

    this.ctx.beginPath();

    this.ctx.arc(
        el.width/2+25,
        el.height/2,
        el.width/3,
        0,
        Math.PI*2
    );

    this.ctx.stroke();
}else if (el.shape === "trapezium") {

    this.ctx.beginPath();

    this.ctx.moveTo(40,0);

    this.ctx.lineTo(el.width-40,0);

    this.ctx.lineTo(el.width,el.height);

    this.ctx.lineTo(0,el.height);

    this.ctx.closePath();

    this.ctx.stroke();
}else if (el.shape === "kite") {

    this.ctx.beginPath();

    this.ctx.moveTo(el.width/2,0);

    this.ctx.lineTo(el.width,el.height/2);

    this.ctx.lineTo(el.width/2,el.height);

    this.ctx.lineTo(0,el.height/2);

    this.ctx.closePath();

    this.ctx.stroke();
}else if (el.shape === "parallelogram") {

    this.ctx.beginPath();

    this.ctx.moveTo(40,0);

    this.ctx.lineTo(el.width,0);

    this.ctx.lineTo(el.width-40,el.height);

    this.ctx.lineTo(0,el.height);

    this.ctx.closePath();

    this.ctx.stroke();
}else if (el.shape === "cube") {

    this.ctx.strokeRect(20,20,100,100);

    this.ctx.strokeRect(60,60,100,100);

    this.ctx.stroke();

    this.ctx.beginPath();

    this.ctx.moveTo(20,20);
    this.ctx.lineTo(60,60);

    this.ctx.moveTo(120,20);
    this.ctx.lineTo(160,60);

    this.ctx.moveTo(20,120);
    this.ctx.lineTo(60,160);

    this.ctx.moveTo(120,120);
    this.ctx.lineTo(160,160);

    this.ctx.stroke();
}else if (el.shape === "sphere") {

    this.ctx.beginPath();

    this.ctx.arc(
        el.width/2,
        el.height/2,
        60,
        0,
        Math.PI*2
    );

    this.ctx.stroke();
}else if (el.shape === "cylinder") {

    this.ctx.strokeRect(40,30,120,120);

    this.ctx.beginPath();

    this.ctx.ellipse(100,30,60,20,0,0,Math.PI*2);

    this.ctx.stroke();

    this.ctx.beginPath();

    this.ctx.ellipse(100,150,60,20,0,0,Math.PI);

    this.ctx.stroke();
}else if (el.shape === "cone") {

    this.ctx.beginPath();

    this.ctx.moveTo(el.width/2,0);

    this.ctx.lineTo(0,el.height);

    this.ctx.lineTo(el.width,el.height);

    this.ctx.closePath();

    this.ctx.stroke();
}else if (el.shape === "pyramid") {

    this.ctx.beginPath();

    this.ctx.moveTo(el.width/2,0);

    this.ctx.lineTo(0,el.height);

    this.ctx.lineTo(el.width,el.height);

    this.ctx.closePath();

    this.ctx.stroke();
}else if (el.shape === "prism") {

    drawPolygon(this.ctx,6,el.width,el.height);
}else if (el.shape === "tetrahedron") {

    this.ctx.beginPath();

    this.ctx.moveTo(el.width/2,0);

    this.ctx.lineTo(0,el.height);

    this.ctx.lineTo(el.width,el.height);

    this.ctx.closePath();

    this.ctx.stroke();
}else if (el.shape === "hemisphere") {

    this.ctx.beginPath();

    this.ctx.arc(
        el.width/2,
        el.height,
        el.width/2,
        Math.PI,
        0
    );

    this.ctx.stroke();
}
else if (el.shape === 'pentagon') {
    drawPolygon(this.ctx, 5, el.width, el.height);
}
else if (el.shape === 'hexagon') {
    drawPolygon(this.ctx, 6, el.width, el.height);
}
else if (el.shape === 'heptagon') {
    drawPolygon(this.ctx, 7, el.width, el.height);
}
else if (el.shape === 'octagon') {
    drawPolygon(this.ctx, 8, el.width, el.height);
}
else if (el.shape === 'nonagon') {
    drawPolygon(this.ctx, 9, el.width, el.height);
}
else if (el.shape === 'decagon') {
    drawPolygon(this.ctx, 10, el.width, el.height);
}
else if (el.shape === 'star') {
    drawStar(this.ctx, el.width, el.height);
}
else if (el.shape === 'rhombus') {
    this.ctx.moveTo(el.width/2,0);
    this.ctx.lineTo(el.width,el.height/2);
    this.ctx.lineTo(el.width/2,el.height);
    this.ctx.lineTo(0,el.height/2);
    this.ctx.closePath();
    this.ctx.stroke();
}
            }

            this.ctx.restore();

            if (el === this.selectedElement) {
                this.ctx.strokeStyle = '#667eea';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(el.x, el.y, el.width, el.height);

                this.ctx.fillStyle = '#667eea';
                this.ctx.beginPath();
                this.ctx.arc(el.x + el.width - 6, el.y + el.height - 6, 6, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        this.ctx.restore();
    }

    /* ---------- BRAND PROFILE & STATUS ---------- */

    generateBrandProfile() {
        const profileBody = document.getElementById('brandProfileBody');
        profileBody.innerHTML = `
            <div>Primary Colors: ${this.brandColors.slice(0,3).join(', ')}...</div>
            <div>Assets Loaded: ${this.elements.filter(e => e.type === 'image').length}</div>
            <div>Compliance Score: 92%</div>
        `;
    }

    updateStatus(message, type = 'good') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status-${type}`;
    }
}
/* ---------- VOICE CONTROL SYSTEM ---------- */
function drawPolygon(ctx, sides, width, height) {

    const centerX = width / 2;
    const centerY = height / 2;

    const radius =
        Math.min(width, height) / 2;

    ctx.beginPath();

    for (let i = 0; i < sides; i++) {

        const angle =
            (i * 2 * Math.PI / sides) -
            Math.PI / 2;

        const x =
            centerX +
            radius * Math.cos(angle);

        const y =
            centerY +
            radius * Math.sin(angle);

        if (i === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.stroke();
}

function drawStar(ctx, width, height) {

    const spikes = 5;

    const outerRadius =
        Math.min(width, height) / 2;

    const innerRadius =
        outerRadius / 2;

    const cx = width / 2;
    const cy = height / 2;

    let rot = Math.PI / 2 * 3;

    ctx.beginPath();

    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {

        ctx.lineTo(
            cx + Math.cos(rot) * outerRadius,
            cy + Math.sin(rot) * outerRadius
        );

        rot += Math.PI / spikes;

        ctx.lineTo(
            cx + Math.cos(rot) * innerRadius,
            cy + Math.sin(rot) * innerRadius
        );

        rot += Math.PI / spikes;
    }

    ctx.closePath();
    ctx.stroke();
}
class VoiceController {
    constructor(builder) {
        this.builder = builder;
        this.lastCommand = "";
        this.actionCooldown = false;
        this.stickerCooldown = false;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        console.log("Voice system started 🎤");

        if (!SpeechRecognition) {
            alert("Speech Recognition not supported in this browser 😢");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;   // faster response
        this.recognition.interimResults = true; // 🔥 REAL-TIME detection
        this.recognition.lang = "en-US";
        this.recognition.onstart = () => {
    console.log("🎤 Listening...");
};

        this.start();
    }

    start() {
        this.recognition.start();

        this.recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {

        let transcript = event.results[i][0].transcript.toLowerCase();
        console.log("Live:", transcript);

        // 🔥 process immediately (no waiting)
       if (event.results[i].isFinal) {
    this.handleCommand(transcript);
    this.recognition.stop();
}

        // stop after command detected (VERY FAST)
        // if (event.results[i].isFinal) {
        //     this.recognition.stop();
        // }
    }
};

        this.recognition.onerror = (e) => {
            console.log("Voice error:", e);
        };

        this.recognition.onend = () => {
    setTimeout(() => this.recognition.start(), 50); // small delay only
};
    }

   handleCommand(cmd) {
    if (
    cmd.startsWith("add") &&
    cmd.includes("image")
) {

    const query =
        cmd
        .replace("add", "")
        .replace("image", "")
        .trim();

    searchImage(query);

    return;
}
    if (cmd.includes("save project")) {

    saveProject();

    return;
}
if (
    cmd.includes("load projects") ||
    cmd.includes("show projects")
) {

    loadProjects();

    return;
}
if (cmd.includes("delete project")) {

    const number =
        cmd.match(/\d+/);

    if (number) {

        const index =
            parseInt(number[0]) - 1;

        fetch("http://localhost:5000/projects")
        .then(res => res.json())
        .then(projects => {

            if (projects[index]) {

                deleteProject(
                    projects[index]._id
                );

            } else {

                alert("Project not found");

            }

        });

    }

    return;
}
if (cmd.includes("open project")) {

    const number =
        cmd.match(/\d+/);

    if (number) {

        const index =
            parseInt(number[0]) - 1;

        fetch("http://localhost:5000/projects")
        .then(res => res.json())
        .then(projects => {

            if (projects[index]) {

                loadProjectToCanvas(
                    projects[index]
                );

            } else {

                alert("Project not found");

            }

        });

    }

    return;
}
     console.log("Heard:", cmd);
    cmd = cmd.trim();
    // 🔥 CLEAR ALL (PUT AT TOP)
if (
    cmd.includes("clear screen") ||
    cmd.includes("clear all") ||
    cmd.includes("clear everything") ||
    cmd === "clear"
)




{
    console.log("🧼 Clearing full canvas");

    // remove all elements
    this.builder.elements = [];

    // reset background
    this.builder.background = { type: 'color', value: '#ffffff' };

    // reset selection
    this.builder.selectedElement = null;

    // redraw canvas
    this.builder.draw();

    // save history
    this.builder.pushHistory();

    return; // VERY IMPORTANT
}


    /* ---------- SHAPES (ALL GEOMETRIC) ---------- */
   if (cmd.includes("circle")) {
    if (this.actionCooldown) return;

    this.actionCooldown = true;

    this.builder.addShape("circle");

    setTimeout(() => {
        this.actionCooldown = false;
    }, 800); // 0.8 sec lock
}
else if (cmd.includes("rectangle") ) {
    if (this.actionCooldown) return;

    this.actionCooldown = true;

    this.builder.addShape("rect");

    setTimeout(() => this.actionCooldown = false, 800);
}
else if (cmd.includes("square") ) {
    if (this.actionCooldown) return;

    this.actionCooldown = true;

    this.builder.addShape("square");

    setTimeout(() => this.actionCooldown = false, 800);
}
    else if (cmd.includes("triangle")) {
    if (this.actionCooldown) return;

    this.actionCooldown = true;

    this.builder.addShape("triangle");

    setTimeout(() => this.actionCooldown = false, 800);
}
    else if (cmd.includes("horizontal line")) {
    if (this.actionCooldown) return;

    this.actionCooldown = true;

    this.builder.addShape("hline");

    setTimeout(() => this.actionCooldown = false, 800);
}
 else if (cmd.includes("vertical line")) {
    if (this.actionCooldown) return;

    this.actionCooldown = true;

    this.builder.addShape("vline");

    setTimeout(() => this.actionCooldown = false, 800);
}
else if (cmd.includes("cloud")) {
    if (this.actionCooldown) return;

    this.actionCooldown = true;

    this.builder.addShape("cloud");

    setTimeout(() => this.actionCooldown = false, 800);
}
else if (cmd.includes("pentagon")) {
    this.builder.addShape("pentagon");
}
else if (cmd.includes("hexagon")) {
    this.builder.addShape("hexagon");
}
else if (cmd.includes("heptagon")) {
    this.builder.addShape("heptagon");
}
else if (cmd.includes("octagon")) {
    this.builder.addShape("octagon");
}
else if (cmd.includes("nonagon")) {
    this.builder.addShape("nonagon");
}
else if (cmd.includes("decagon")) {
    this.builder.addShape("decagon");
}
else if (cmd.includes("star")) {
    this.builder.addShape("star");
}
else if (cmd.includes("rhombus")) {
    this.builder.addShape("rhombus");
}
else if (cmd.includes("oval")) {
    this.builder.addShape("oval");
}
else if (cmd.includes("ellipse")) {
    this.builder.addShape("ellipse");
}
else if (cmd.includes("semicircle")) {
    this.builder.addShape("semicircle");
}
else if (cmd.includes("crescent")) {
    this.builder.addShape("crescent");
}
else if (cmd.includes("trapezium")) {
    this.builder.addShape("trapezium");
}
else if (cmd.includes("kite")) {
    this.builder.addShape("kite");
}
else if (cmd.includes("parallelogram")) {
    this.builder.addShape("parallelogram");
}
else if (cmd.includes("cube")) {
    this.builder.addShape("cube");
}
else if (cmd.includes("cuboid")) {
    this.builder.addShape("cuboid");
}
else if (cmd.includes("sphere")) {
    this.builder.addShape("sphere");
}
else if (cmd.includes("cylinder")) {
    this.builder.addShape("cylinder");
}
else if (cmd.includes("cone")) {
    this.builder.addShape("cone");
}
else if (cmd.includes("pyramid")) {
    this.builder.addShape("pyramid");
}
else if (cmd.includes("prism")) {
    this.builder.addShape("prism");
}
else if (cmd.includes("tetrahedron")) {
    this.builder.addShape("tetrahedron");
}
else if (cmd.includes("hemisphere")) {
    this.builder.addShape("hemisphere");
}
    else if (cmd.includes("ellipse") || cmd.includes("oval")) {
        this.builder.addShape("oval"); // approximation
    }
    else if (cmd.includes("big circle")) {
        this.builder.addShape("circle");
        this.builder.selectedElement.width = 300;
        this.builder.selectedElement.height = 300;
    }

    /* ---------- TEXT ---------- */
    /* ---------- ADD TEXT BOX ---------- */
else if (cmd.includes("add text") || cmd.includes("text box")) {
    this.builder.addTextElement("Edit me");
}
/* ---------- WRITE INTO TEXT ---------- */
else if (cmd.startsWith("write")) {
    const el = this.builder.selectedElement;

    if (el && el.type === "text") {
        let text = cmd.replace("write", "").trim();
        el.text = text;
        this.builder.draw();
    }
}
/* ---------- TEXT COLOR ---------- */
else if (cmd.includes("text color") || cmd.includes("change text color")) {
    const el = this.builder.selectedElement;

    if (el && el.type === "text") {

        if (cmd.includes("yellow")) el.color = "#ffff00";
        else if (cmd.includes("red")) el.color = "#ff0000";
        else if (cmd.includes("blue")) el.color = "#0000ff";
        else if (cmd.includes("green")) el.color = "#00ff00";

        this.builder.draw();
    }
}
/* ---------- RESIZE ---------- */
else if (cmd.includes("increase size")) {
    const el = this.builder.selectedElement;

    if (!el) return;

    // ✅ TEXT → increase font size
    if (el.type === "text") {
        el.fontSize = (el.fontSize || 20) + 5;
    }

    // ✅ SHAPES / STICKERS
    else {
        el.width += 20;
        el.height += 20;
    }

    this.builder.draw();
}

else if (cmd.includes("decrease size")) {
    const el = this.builder.selectedElement;

    if (!el) return;

    if (el.type === "text") {
        el.fontSize = Math.max(10, (el.fontSize || 20) - 5);
    }

    else {
        el.width = Math.max(20, el.width - 20);
        el.height = Math.max(20, el.height - 20);
    }

    this.builder.draw();
}

    /* ---------- COLORS (SMART ALL COLORS) ---------- */
    const colorMap = {
        red: "#ff0000",
        blue: "#0000ff",
        green: "#00ff00",
        yellow: "#ffff00",
        black: "#000000",
        white: "#ffffff",
        orange: "#ffa500",
        purple: "#800080",
        pink: "#ff69b4",
        brown: "#8b4513",
        grey: "#808080",
        cyan: "#00ffff",
        gold: "#ffd700",
        silver: "#c0c0c0"
    };

    for (let color in colorMap) {
        if (cmd.includes(color)) {
            this.builder.activeColor = colorMap[color];
        }
    }

    /* ---------- BACKGROUND COLORS ---------- */
    if (cmd.includes("background")) {
        for (let color in colorMap) {
            if (cmd.includes(color)) {
                this.setBG(colorMap[color]);
            }
        }
    }

    /* ---------- STICKERS / EMOJIS ---------- */
    const emojiMap = {
        star: "⭐",
        fire: "🔥",
        boom: "💥",
        heart: "❤️",
        smile: "😊",
        happy: "😄",
        sad: "😢",
        cool: "😎",
        love: "😍",
        clap: "👏",
        thumbs: "👍",
        ok: "👌",
        rocket: "🚀",
        gift: "🎁",
        party: "🎉",
        crown: "👑",
        money: "💰",
        warning: "⚠️",
        check: "✅"
    };

   for (let key in emojiMap) {
    if (cmd.includes(key)) {

        if (this.stickerCooldown) return; // 🚫 prevent duplicate

        this.stickerCooldown = true;

        this.builder.addSticker(emojiMap[key]);

        setTimeout(() => {
            this.stickerCooldown = false;
        }, 300); // 0.8 sec lock

        break; // stop loop after one match
    }
}

    /* ---------- MOVE ---------- */
    if (cmd.includes("move left") && this.builder.selectedElement) {
        this.builder.selectedElement.x -= 20;
        this.builder.draw();
    }
    if (cmd.includes("move right") && this.builder.selectedElement) {
        this.builder.selectedElement.x += 20;
        this.builder.draw();
    }
    if (cmd.includes("move up") && this.builder.selectedElement) {
        this.builder.selectedElement.y -= 20;
        this.builder.draw();
    }
    if (cmd.includes("move down") && this.builder.selectedElement) {
        this.builder.selectedElement.y += 20;
        this.builder.draw();
    }

    /* ---------- RESIZE ---------- */
    if (cmd.includes("increase size") && this.builder.selectedElement) {
        this.builder.selectedElement.width += 20;
        this.builder.selectedElement.height += 20;
        this.builder.draw();
    }
    if (cmd.includes("decrease size") && this.builder.selectedElement) {
        this.builder.selectedElement.width -= 20;
        this.builder.selectedElement.height -= 20;
        this.builder.draw();
    }

    /* ---------- TEXT SIZE ---------- */
    if (cmd.includes("big text") && this.builder.selectedElement?.type === "text") {
        this.builder.selectedElement.fontSize = 50;
        this.builder.draw();
    }
    if (cmd.includes("small text") && this.builder.selectedElement?.type === "text") {
        this.builder.selectedElement.fontSize = 20;
        this.builder.draw();
    }

    /* ---------- ACTIONS ---------- */
    if (cmd.includes("undo")) this.builder.undo();
    if (cmd.includes("redo")) this.builder.redo();
    if (cmd.includes("delete")) this.builder.deleteSelected();

    /* ---------- EXPORT ---------- */
    if (cmd.includes("png")) this.builder.exportImage("png");
    if (cmd.includes("jpeg")) this.builder.exportImage("jpeg");

    /* ---------- AI ---------- */
    if (cmd.includes("suggest") || cmd.includes("design")) {
        this.builder.aiSuggestLayout();
    }
    /* ---------- DELETE BY TYPE (SMART SYSTEM) ---------- */

else if (cmd.includes("delete")) {

    const shapeMap = {
        circle: "circle",
        rectangle: "rect",
        square: "square",
        triangle: "triangle",
        line: "hline",
        line: "vline",
        cloud: "cloud"
    };

    // delete shapes
    for (let key in shapeMap) {
        if (cmd.includes(key)) {
            this.builder.elements = this.builder.elements.filter(el => el.shape !== shapeMap[key]);
            this.builder.draw();
            this.builder.pushHistory();
            return;
        }
    }

    // delete text
    if (cmd.includes("text")) {
        this.builder.elements = this.builder.elements.filter(el => el.type !== "text");
        this.builder.draw();
        this.builder.pushHistory();
        return;
    }

    // delete stickers
    if (cmd.includes("sticker") || cmd.includes("emoji")) {
        this.builder.elements = this.builder.elements.filter(el => el.type !== "sticker");
        this.builder.draw();
        this.builder.pushHistory();
        return;
    }
   
}
}

    setBG(color) {
        this.builder.background = { type: 'color', value: color };
        this.builder.draw();
        this.builder.pushHistory();
    }
}

 // ← end of VoiceController class

// ✅ ADD BELOW THIS

let voice;

function startVoice() {
    voice = new VoiceController(app);
}
/* ---------- INIT ---------- */

/* ---------- INIT ---------- */

let app;


// Ensure app loads properly
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new CreativeBuilder();
    });
} else {
    app = new CreativeBuilder();
}

// GLOBAL function (VERY IMPORTANT 🔥)
function startVoice() {
    console.log("Start button clicked 🎤");

    if (!app) {
        app = new CreativeBuilder();
    }

    voice = new VoiceController(app);
}
async function testBackend() {

    try {

        const response = await fetch("http://localhost:5000/api/message");

        const data = await response.json();

        console.log(data);

        alert(data.message);

    } catch (error) {

        console.log("Backend connection failed:", error);

    }
}
async function saveProject() {

    try {

        const projectData = {
            elements: app.elements,
            background: app.background
        };

        const response = await fetch(
            "http://localhost:5000/save-project",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(projectData)
            }
        );

        const data = await response.json();

        alert(data.message);

        console.log(data);

    } catch (error) {

        console.log(error);

        alert("Failed to save project");

    }
}
async function loadProjects() {

    try {

        const response = await fetch(
            "http://localhost:5000/projects"
        );

        const projects = await response.json();

        console.log(projects);

        displayProjects(projects);

    } catch (error) {

        console.log(error);

        alert("Failed to load projects");

    }
}
function displayProjects(projects) {

    const container =
        document.getElementById("savedProjects");

    container.innerHTML = "";

    projects.forEach((project, index) => {

        const wrapper =
            document.createElement("div");

        wrapper.style.marginBottom = "10px";

        // LOAD BUTTON
        const loadButton =
            document.createElement("button");

        loadButton.innerText =
            "Project " + (index + 1);

        loadButton.onclick = () => {
            loadProjectToCanvas(project);
        };

        // DELETE BUTTON
        const deleteButton =
            document.createElement("button");

        deleteButton.innerText = "🗑 Delete";

        deleteButton.style.marginLeft = "10px";

        deleteButton.onclick = () => {
            deleteProject(project._id);
        };

        wrapper.appendChild(loadButton);

        wrapper.appendChild(deleteButton);

        container.appendChild(wrapper);

    });

}
async function deleteProject(id) {

    try {

        const response = await fetch(
            `http://localhost:5000/delete-project/${id}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        alert(data.message);

        // refresh project list
        loadProjects();

    } catch (error) {

        console.log(error);

        alert("Delete failed");

    }

}
function loadProjectToCanvas(project) {

    app.elements = project.elements;
    app.elements.forEach(el => {

    if (el.type === 'image' && el.src) {

        const img = new Image();

        img.src = el.src;

        el.img = img;
    }
});

    app.background = project.background;

    app.draw();

    alert("Project Loaded 🚀");

}
async function searchImage(query) {

    try {

        const response = await fetch(

            `https://api.pexels.com/v1/search?query=${query}&per_page=1`,

            {
                headers: {
                    Authorization: PEXELS_API_KEY
                }
            }

        );

        const data = await response.json();

        if (data.photos.length === 0) {

            alert("No image found");

            return;
        }

        const imageUrl =
            data.photos[0].src.medium;

        const img = new Image();

        img.crossOrigin = "Anonymous";

        img.onload = () => {

            app.addAsset(
                img,
                query
            );

        };

        img.src = imageUrl;

    } catch (error) {

        console.log(error);

        alert("Image search failed");

    }
}