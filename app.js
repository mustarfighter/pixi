const app = new PIXI.Application({ 
    width: 800, 
    height: 600,
    backgroundColor: 0x004c00
});
document.body.appendChild(app.view);
let image;

// Kép betöltése és méretezése
function loadImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        PIXI.Loader.shared
            .add('tempImage', e.target.result)  // Ideiglenes azonosító a betöltött képnek
            .load((loader, resources) => {
                if (image) {
                    app.stage.removeChild(image);
                }

                image = new PIXI.Sprite(resources.tempImage.texture);

                // Kép méretének és pozíciójának beállítása
                let originalRatio = image.texture.orig.width / image.texture.orig.height;
                let maxW = app.screen.width * 0.8;
                let maxH = app.screen.height * 0.8;
                let targetRatio = maxW / maxH;

                if (originalRatio > targetRatio) {
                    image.width = maxW;
                    image.height = maxW / originalRatio;
                } else {
                    image.height = maxH;
                    image.width = maxH * originalRatio;
                }

                image.x = app.screen.width / 2;
                image.y = app.screen.height / 2;
                image.anchor.set(0.5);

                // Kivágási terület beállítása a képhez igazítva
                cropArea.clear()
                    .beginFill(0xFFFFFF, 0.4)
                    .drawRect(0, 0, image.width, image.height)
                    .endFill();
                cropArea.x = image.x - image.width / 2;
                cropArea.y = image.y - image.height / 2;

                // Fogantyúk helyének frissítése
                resetHandles();

                // Kép és kivágási terület hozzáadása a színpadhoz
                app.stage.addChild(image);
                app.stage.addChild(cropArea);
                app.stage.addChild(tl);
                app.stage.addChild(tr);
                app.stage.addChild(bl);
                app.stage.addChild(br);

                // Eltávolítjuk a tempImage-et a Loaderből
                PIXI.Loader.shared.reset();
            });
    };
    reader.readAsDataURL(file);
}

function resetHandles() {
    tl.x = cropArea.x;
    tl.y = cropArea.y;
    tr.x = cropArea.x + cropArea.width;
    tr.y = cropArea.y;
    bl.x = cropArea.x;
    bl.y = cropArea.y + cropArea.height;
    br.x = cropArea.x + cropArea.width;
    br.y = cropArea.y + cropArea.height;
}


document.getElementById('fileUploader').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        loadImage(file);
    }
});
// Kivágási terület inicializálása
const cropArea = new PIXI.Graphics()
    .beginFill(0xFFFFFF, 0.4)
    .drawRect(0, 0, 400, 200)
    .endFill();
cropArea.x = 1000;
cropArea.y = 225;
cropArea.buttonMode = true;
cropArea.interactive = true;
app.stage.addChild(cropArea);

// Fogantyúk inicializálása
function createHandle(x, y) {
    let handle = new PIXI.Graphics()
        .beginFill(0x00FF00)
        .drawCircle(0, 0, 8)
        .endFill();
    handle.x = x;
    handle.y = y;
    handle.interactive = true;
    handle.buttonMode = true;
    handle
        .on('pointerdown', onDragStart)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd)
        .on('pointermove', onDragMove);
    return handle;
}

let tl = createHandle(cropArea.x, cropArea.y);
let tr = createHandle(cropArea.x + cropArea.width, cropArea.y);
let bl = createHandle(cropArea.x, cropArea.y + cropArea.height);
let br = createHandle(cropArea.x + cropArea.width, cropArea.y + cropArea.height);
app.stage.addChild(tl);
app.stage.addChild(tr);
app.stage.addChild(bl);
app.stage.addChild(br);

// Draggelési események
function onDragStart(event) {
    this.data = event.data;
    this.dragging = true;
}

function onDragEnd() {
    this.dragging = false;
    this.data = null;
}

function clampHandle(handle, minX, maxX, minY, maxY) {
    handle.x = Math.min(Math.max(handle.x, minX), maxX);
    handle.y = Math.min(Math.max(handle.y, minY), maxY);
}


function onDragMove() {
    if (!this.dragging) return;

    const newPosition = this.data.getLocalPosition(this.parent);
    this.x = newPosition.x;
    this.y = newPosition.y;

    // Korlátozzuk a fogantyúk mozgását a kép határain belül
    const imageBounds = {
        minX: image.x - image.width / 2,
        maxX: image.x + image.width / 2,
        minY: image.y - image.height / 2,
        maxY: image.y + image.height / 2
    };

    clampHandle(this, imageBounds.minX, imageBounds.maxX, imageBounds.minY, imageBounds.maxY);


        if (this === bl || this === tr) {
            cropArea.x = Math.min(bl.x, tr.x);
            cropArea.y = Math.min(bl.y, tr.y);
            cropArea.width = Math.abs(bl.x - tr.x);
            cropArea.height = Math.abs(bl.y - tr.y);

            br.x = cropArea.x + cropArea.width;
            br.y = cropArea.y + cropArea.height;
            tl.x = cropArea.x;
            tl.y = cropArea.y;
        } else {
            cropArea.x = Math.min(tl.x, br.x);
            cropArea.y = Math.min(tl.y, br.y);
            cropArea.width = Math.abs(tl.x - br.x);
            cropArea.height = Math.abs(tl.y - br.y);

            bl.x = cropArea.x;
            bl.y = cropArea.y + cropArea.height;
            tr.x = cropArea.x + cropArea.width;
            tr.y = cropArea.y;
        }
}


// Kivágási terület mozgatásának kezelése
let draggingArea = false;
let areaStartX, areaStartY;

cropArea
    .on('pointerdown', onAreaDragStart)
    .on('pointerup', onAreaDragEnd)
    .on('pointerupoutside', onAreaDragEnd)
    .on('pointermove', onAreaDragMove);

function onAreaDragStart(event) {
    this.data = event.data;
    draggingArea = true;
    areaStartX = this.data.getLocalPosition(this.parent).x - this.x;
    areaStartY = this.data.getLocalPosition(this.parent).y - this.y;
}

function onAreaDragEnd() {
    draggingArea = false;
    this.data = null;
}

function onAreaDragMove() {
    if (draggingArea) {
        const newPosition = this.data.getLocalPosition(this.parent);
        cropArea.x = newPosition.x - areaStartX;
        cropArea.y = newPosition.y - areaStartY;

        tl.x = cropArea.x;
        tl.y = cropArea.y;
        tr.x = cropArea.x + cropArea.width;
        tr.y = cropArea.y;
        bl.x = cropArea.x;
        bl.y = cropArea.y + cropArea.height;
        br.x = cropArea.x + cropArea.width;
        br.y = cropArea.y + cropArea.height;
    }
}

// Kivágás gomb
const buttonStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 24,
    fill: '#ffffff', // Szöveg színe
    align: 'center',
    // További stílusbeállítások...
});

const cropButton = new PIXI.Text('Crop', buttonStyle);
cropButton.x = 700;
cropButton.y = 10;
cropButton.interactive = true;
cropButton.buttonMode = true;

// Háttér és keret hozzáadása
const buttonBackground = new PIXI.Graphics();
buttonBackground.beginFill(0x00cc00); // Háttérszín
buttonBackground.drawRoundedRect(cropButton.x, cropButton.y, cropButton.width, cropButton.height, 5); // Kerekített sarkú téglalap
buttonBackground.endFill();

// Háttér hozzáadása a színpadhoz
app.stage.addChild(buttonBackground);
// Gomb hozzáadása a színpadhoz (a háttér fölé)
app.stage.addChild(cropButton);

// Gomb eseménykezelője
cropButton.on('pointerdown', cropImage);

function cropImage() {
    // Számítsuk ki a kivágási koordinátákat az eredeti képhez viszonyítva
    let scaleX = image.scale.x;
    let scaleY = image.scale.y;
    let cropX = (cropArea.x - image.x + (image.width / 2)) / scaleX + image.texture.orig.width / 2 - image.width / (2 * scaleX);
    let cropY = (cropArea.y - image.y + (image.height / 2)) / scaleY + image.texture.orig.height / 2 - image.height / (2 * scaleY);
    let cropWidth = cropArea.width / scaleX;
    let cropHeight = cropArea.height / scaleY;
    let rectangle = new PIXI.Rectangle(cropX, cropY, cropWidth, cropHeight);

    let croppedTexture = new PIXI.Texture(image.texture.baseTexture, rectangle);

    // Létrehozzuk a kivágott kép sprite-ját
    let croppedImage = new PIXI.Sprite(croppedTexture);
    app.stage.addChild(croppedImage);
    let dataURL = app.renderer.plugins.extract.base64(croppedImage);
    app.stage.removeChild(croppedImage); // Eltávolítjuk, miután kinyertük a képadatokat

    // Letöltési link létrehozása
    let downloadLink = document.createElement('a');
    downloadLink.href = dataURL;
    downloadLink.download = 'cropped-image.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}