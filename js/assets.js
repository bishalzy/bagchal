import tigerUrl from '../Tiger.webp';
import goatUrl from '../goat.webp';

export const IMG_TIGER = new Image();
IMG_TIGER.src = tigerUrl;

export const IMG_GOAT = new Image();
IMG_GOAT.src = goatUrl;

let imagesLoaded = 0;
export function setupAssets(onLoadCallback) {
    function onImageLoad() {
        imagesLoaded++;
        if (imagesLoaded >= 2) onLoadCallback();
    }
    IMG_TIGER.onload = onImageLoad;
    IMG_GOAT.onload = onImageLoad;
}
