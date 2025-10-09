
const board = document.querySelector('.board');          // Find the container div
const canvas = document.getElementById('gameCanvas');    // Find our drawing canvas
const ctx = canvas.getContext('2d');                    // Get the "drawing pen" for canvas


const BOARD_SIZE = 500;         // The actual game board is 500x500 pixels
const PADDING = BOARD_SIZE * 0.1;  // 10% padding around the board (50 pixels)
const CANVAS_SIZE = BOARD_SIZE + (PADDING * 2);  // Canvas size: 500 + 100 = 600 pixels
const GRID_SIZE = 4;            // 4 divisions create 5 lines (like a tic-tac-toe grid but bigger)
const CELL_SIZE = BOARD_SIZE / GRID_SIZE;  // Each cell is 125x125 pixels (500÷4=125)
const CLICK_TOLERANCE = 20;     // Allow clicks within 20 pixels of intersection points



const intersections = [];       // Array = list of all clickable points on the board
// const markedPoints = new Set(); //fetch from backend for position Set = collection that prevents duplicate entries this is just for trial 
const markedPointsBagh = new Set();// position for bagh
const markedPointsBakhra = new Set();// position for bakhra
// let indexs = ['a1','b1','c1','d1','e1','a2','b2','c2','d2','e2','a3','b3','c3','d3','e3','a4','b4','c4','d4','e4','a5','b5','c5','d5','e5'];
let indexValue = ['a5','b5','c5','d5','e5','a4','b4','c4','d4','e4','a3','b3','c3','d3','e3','a2','b2','c2','d2','e2','a1','b1','c1','d1','e1'];
let index = {};
let bakhraInsertationComplete = false;
let player = 'bakhra';
let selectedPiece = null; // Track which piece is selected for moving


markedPointsBagh.add('e5');
markedPointsBagh.add('e1');
markedPointsBagh.add('a1');
markedPointsBagh.add('a5');
markedPointsBakhra.add('b4');

let bakhraCount = markedPointsBakhra.size;

const MAX_BAGH = 4;
const MAX_BAKHRA = 20;


const fetchGameState = async (url) => {
    // Simulate fetching data from backend
    const response = await fetch(url);
    const data = await response.json();
    return data.position;
}
const updateGameState = async (url, position, player) => {
    // Simulate sending data to backend
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ position, player })
    });
    const data = await response.json();
    return data.success;
}

const drawPieces = (baghPosition, bakhraPosition) => {
    // Draw Bagh pieces

    for (const pos of baghPosition) {
        drawBagh(index[pos].x , index[pos].y);
    }
        

    // Draw Bakhra pieces
    
    for (const pos of bakhraPosition) {
        drawBakhra(index[pos].x , index[pos].y);
    }
};


//generate legal moves for the specific piece
//===================================================
const generateLegalMoves = (pieceType, position) => {

    const legalMoves = [];

    // Get the current position of the piece
    const currentPos = index[position];

    // Define the movement patterns for each piece type
    const movementPatterns = {
        'bagh': [
            { x: -1, y: 0 },  // Move left
            { x: 1, y: 0 },   // Move right
            { x: 0, y: -1 },  // Move up
            { x: 0, y: 1 },   // Move down
        ],
        'bakhra': [
            { x: -1, y: 0 },  // Move left
            { x: 1, y: 0 },   // Move right
            { x: 0, y: -1 },  // Move up
            { x: 0, y: 1 },   // Move down
            { x: -1, y: -1 }, // Move diagonally up-left
            { x: 1, y: -1 },  // Move diagonally up-right
            { x: -1, y: 1 },  // Move diagonally down-left
            { x: 1, y: 1 },   // Move diagonally down-right
        ]
    };

    // Get the movement pattern for the current piece type
    const pattern = movementPatterns[pieceType];

    // Generate all possible moves based on the movement pattern
    for (const move of pattern) {
        const newX = currentPos.x + move.x;
        const newY = currentPos.y + move.y;

        // Check if the new position is within bounds
        if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
            legalMoves.push({ x: newX, y: newY });
        }
    }

    return legalMoves;
};

function calculateIntersections() {
    const points = [];  // Empty array to store all intersection points
    
    for (let row = 0; row <= GRID_SIZE; row++) {        // 5 rows: 0,1,2,3,4
        for (let col = 0; col <= GRID_SIZE; col++) {    // 5 columns: 0,1,2,3,4
         
            points.push({
                x: col * CELL_SIZE + PADDING,    // X position: column number × cell width + padding offset
                y: row * CELL_SIZE + PADDING,    // Y position: row number × cell height + padding offset
         // Label this as a grid intersection
            });
            
        }
    }
    
    return points;  // Send back the complete list of intersection points
}


function drawGrid() {
    
    ctx.strokeStyle = '#000';  // Line color: black (#000 is hex code for black)
    ctx.lineWidth = 2;         // Line thickness: 2 pixels wide
    
    
    for (let i = 0; i <= GRID_SIZE; i++) {
  
        ctx.beginPath();                                    // Start a new line
        ctx.moveTo(PADDING, i * CELL_SIZE + PADDING);      // Move to left edge at this row (with padding)
        ctx.lineTo(BOARD_SIZE + PADDING, i * CELL_SIZE + PADDING); // Draw to right edge (with padding)
        ctx.stroke();                                       // Make the line visible
    }
    

    
    for (let i = 0; i <= GRID_SIZE; i++) {
        
        ctx.beginPath();                                    // Start a new line
        ctx.moveTo(i * CELL_SIZE + PADDING, PADDING);      // Move to top edge at this column (with padding)
        ctx.lineTo(i * CELL_SIZE + PADDING, BOARD_SIZE + PADDING); // Draw to bottom edge (with padding)
        ctx.stroke();                                       // Make the line visible
    }
    
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);                                   // Start at top-left corner (25,25)
    ctx.lineTo(BOARD_SIZE + PADDING, BOARD_SIZE + PADDING);         // Draw to bottom-right (525,525)
    ctx.stroke();
    
    // ANTI-DIAGONAL: top-right to bottom-left (/)
    ctx.beginPath();
    ctx.moveTo(BOARD_SIZE + PADDING, PADDING);                      // Start at top-right corner (525,25)
    ctx.lineTo(PADDING, BOARD_SIZE + PADDING);                      // Draw to bottom-left (25,525)
    ctx.stroke();
    
    

    const topMid    = { x: BOARD_SIZE / 2 + PADDING, y: PADDING };                    // Top edge middle (275,25)
    const rightMid  = { x: BOARD_SIZE + PADDING, y: BOARD_SIZE / 2 + PADDING };      // Right edge middle (525,275)  
    const bottomMid = { x: BOARD_SIZE / 2 + PADDING, y: BOARD_SIZE + PADDING };      // Bottom edge middle (275,525)
    const leftMid   = { x: PADDING, y: BOARD_SIZE / 2 + PADDING };                   // Left edge middle (25,275)
    
    // Draw the four sides of the diamond
    
    // Top side of diamond: top-middle → right-middle
    ctx.beginPath();
    ctx.moveTo(topMid.x, topMid.y);      // Start at top middle
    ctx.lineTo(rightMid.x, rightMid.y);  // Draw to right middle
    ctx.stroke();
    
    // Right side of diamond: right-middle → bottom-middle
    ctx.beginPath();
    ctx.moveTo(rightMid.x, rightMid.y);    // Start at right middle
    ctx.lineTo(bottomMid.x, bottomMid.y);  // Draw to bottom middle
    ctx.stroke();
    
    // Bottom side of diamond: bottom-middle → left-middle
    ctx.beginPath();
    ctx.moveTo(bottomMid.x, bottomMid.y);  // Start at bottom middle
    ctx.lineTo(leftMid.x, leftMid.y);      // Draw to left middle
    ctx.stroke();
    
    // Left side of diamond: left-middle → top-middle (completes the diamond)
    ctx.beginPath();
    ctx.moveTo(leftMid.x, leftMid.y);      // Start at left middle
    ctx.lineTo(topMid.x, topMid.y);        // Draw to top middle
    ctx.stroke();
    
    
    //  INDEXING TEXT (LABELS)
    // ===================================
    // Add letters (a-e) horizontally and numbers (1-5) vertically for reference
    // This helps players identify specific intersection points
    
    // SET TEXT STYLE
    ctx.fillStyle = '#000';          // Black text color
    ctx.font = '16px Arial';         // Font size and family
    ctx.textAlign = 'center';        // Center text horizontally
    ctx.textBaseline = 'middle';     // Center text vertically
    
    
    
    // DRAW VERTICAL LABELS (1, 2, 3, 4, 5)
    // ====================================
    const numbers = ['5', '4', '3', '2', '1'];
    for (let i = 0; i <= GRID_SIZE; i++) {
        const x = PADDING / 2;                 // X position: halfway in left padding area
        const y = i * CELL_SIZE + PADDING;     // Y position of each grid line
        ctx.fillText(numbers[i], x, y);        // Draw the number
    }
    
    // DRAW HORIZONTAL LABELS (a, b, c, d, e)
    // =============================================
    // Add the letters at the bottom for better reference
    const letters = ['a', 'b', 'c', 'd', 'e'];
    for (let i = 0; i <= GRID_SIZE; i++) {
        const x = i * CELL_SIZE + PADDING;     // X position of each grid line
        const y = BOARD_SIZE + PADDING + (PADDING / 2);  // Y position: halfway in bottom padding area
        ctx.fillText(letters[i], x, y);        // Draw the letter
    }
    
}


function drawBagh(x, y) {
    
    // SAVE CURRENT DRAWING SETTINGS
    // =============================
    const originalFillStyle = ctx.fillStyle;
    const originalStrokeStyle = ctx.strokeStyle;
    
    // SET STYLE FOR BAGH (TIGER) PIECE
    // ================================
    const radius = 18;              // Circle radius in pixels (36px diameter)
    ctx.fillStyle = '#000000';      // Solid black color for the tiger
    
    // DRAW THE BAGH CIRCLE
    // ===================
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);  // Draw a complete circle
    ctx.fill();                              // Fill the circle with black color
    

    // RESTORE ORIGINAL DRAWING SETTINGS
    // =================================
    ctx.fillStyle = originalFillStyle;
    ctx.strokeStyle = originalStrokeStyle;
}

function drawBakhra(x, y) {
    
    // SAVE CURRENT DRAWING SETTINGS
    // =============================
    const originalFillStyle = ctx.fillStyle;
    const originalStrokeStyle = ctx.strokeStyle;
    const originalLineWidth = ctx.lineWidth;
    
    // SET STYLE FOR BAKHRA (GOAT) PIECE
    // =================================
    const radius = 10;              // Same radius as bagh for consistency
    ctx.fillStyle = '#FFD700';      // Golden yellow color (#FFD700 = gold)
    ctx.strokeStyle = '#000000';    // Black border color
    ctx.lineWidth = 2;              // Border thickness
    
    // DRAW THE BAKHRA CIRCLE
    // =====================
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);  // Draw a complete circle
    ctx.fill();                              // Fill with golden color
    ctx.stroke();                            // Add black border
    
    
    // RESTORE ORIGINAL DRAWING SETTINGS
    // =================================
    ctx.fillStyle = originalFillStyle;
    ctx.strokeStyle = originalStrokeStyle;
    ctx.lineWidth = originalLineWidth;
}


function findNearestIntersection(clickX, clickY) {
    
    // VARIABLES TO TRACK THE SEARCH
    // ============================
    let nearest = null;           // Will store the closest intersection we find
    let minDistance = Infinity;   // Track the shortest distance found so far
    
    for (let i = 0; i < intersections.length; i++) {
        const point = intersections[i];  // Get the current intersection point
        

        const distance = Math.sqrt(
            Math.pow(clickX - point.x, 2) + Math.pow(clickY - point.y, 2)
        );
        

        if (distance < minDistance && distance <= CLICK_TOLERANCE) {
            minDistance = distance;                    // Update the minimum distance
            nearest = { ...point, index: i };         // Remember this intersection
        }
        

    }
    
    // RETURN THE RESULT
    // ================
    return nearest;  // Either an intersection object, or null if none found
    

}

function removePiece(x, y) {

    
    const nearestPoint = findNearestIntersection(x, y);
    
    if (nearestPoint !== null) {
        
        let removedBakhra = false;

        if (markedPointsBakhra.has(nearestPoint.index)) {
            markedPointsBakhra.delete(nearestPoint.index);  // Remove the Bakhra piece
            removedBakhra = true;
        }
        

        if (removedBakhra) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear canvas
            drawGrid();                                          // Redraw board lines
            drawPieces(markedPointsBagh, markedPointsBakhra);   // Redraw all remaining pieces
            
            // Get coordinate name for logging
            const coordinateName = Object.keys(index)[nearestPoint.index];
            console.log(`Successfully removed piece from ${coordinateName}`);
        } else {
            // STEP 5: LOG IF NO PIECE WAS FOUND
            // =================================
            const coordinateName = Object.keys(index)[nearestPoint.index];
            console.log(`No piece found at ${coordinateName} to remove`);
        }
    } else {

        console.log('Click too far from any intersection - no piece removed');
    }
}

function removePieceByCoordinate(coordinate) {
    // STEP 1: CHECK IF COORDINATE EXISTS
    // =================================
    if (index[coordinate]) {
        // STEP 2: GET PIXEL COORDINATES AND REMOVE
        // =======================================
        const point = index[coordinate];
        removePiece(point.x, point.y);
        console.log(`Attempted to remove piece from ${coordinate} at (${point.x}, ${point.y})`);
    } else {
        // STEP 3: HANDLE INVALID COORDINATES
        // =================================
        console.log(`Invalid coordinate: ${coordinate}. Valid coordinates are a1-e5.`);
        console.log('Available coordinates:', Object.keys(index).sort());
    }
}


function handleCanvasClick(event) {
    

    const rect = canvas.getBoundingClientRect();  // Get canvas position and size info
    const clickX = event.clientX - rect.left;     // Convert to canvas X coordinate
    const clickY = event.clientY - rect.top;      // Convert to canvas Y coordinate
    

    const nearestPoint = findNearestIntersection(clickX, clickY);
    
    if(!selectedPiece){
        if (nearestPoint && !markedPointsBagh.has(nearestPoint.index) && !markedPointsBakhra.has(nearestPoint.index) ) {
            if( player === 'bakhra' && bakhraCount < MAX_BAKHRA) {
                drawBakhra(nearestPoint.x, nearestPoint.y); 
                markedPointsBakhra.add(nearestPoint.index);
                bakhraCount++;
    
                console.log(Object.keys(index)[nearestPoint.index]);
                console.log(nearestPoint.index);
            } else if(player === 'bakhra' && bakhraCount === MAX_BAKHRA && markedPointsBakhra.has(nearestPoint.index)){
                selectedPiece = nearestPoint; // must be inefficient in the future should store the selected piece position and value like e4 and bagh or bakhra
            } else if(player === 'bagh' && markedPointsBagh.has(nearestPoint.index)){
                selectedPiece = nearestPoint;
            }
    
        }
        else{
            if(!markedPointsBagh.has(nearestPoint.index) && !markedPointsBakhra.has(nearestPoint.index)){
                if(markedPointsBagh.has(selectedPiece.index) && !markedPointsBagh.has(nearestPoint.index) && !markedPointsBakhra.has(nearestPoint.index)){
                    removePieceByCoordinate(selectedPiece.x,selectedPiece.y);
                    drawBagh(nearestPoint.x,nearestPoint.y);
                    markedPointsBagh.delete(selectedPiece.index);
                    selectedPiece = null;
                    redrawBoard();
                }else if(markedPointsBakhra.has(selectedPiece.index) && !markedPointsBagh.has(nearestPoint.index) && !markedPointsBakhra.has(nearestPoint.index)){
                    removePieceByCoordinate(selectedPiece.x,selectedPiece.y);
                    drawBakhra(nearestPoint.x,nearestPoint.y);
                    markedPointsBakhra.delete(selectedPiece.x,selectedPiece.y);
                    selectedPiece = null;
                    redrawBoard();
                }else{
                    console.log("cannot perform the action");
                }
            }
        }

    }

    

}



let isDragging = false;        // Track if we're currently dragging
let draggedPiece = null;       // Which piece is being dragged
let draggedFromIndex = null;   // Where the piece was dragged from
let mouseX = 0, mouseY = 0;    // Current mouse position


function setupDragHandlers() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp); // End drag if mouse leaves canvas
}

function handleMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    const nearestPoint = findNearestIntersection(clickX, clickY);
    
    if (nearestPoint) {
        // Check if there's a Bagh piece at this location
        if (markedPointsBagh.has(nearestPoint.index)) {
            isDragging = true;
            draggedPiece = 'bagh';
            draggedFromIndex = nearestPoint.index;
            mouseX = clickX;
            mouseY = clickY;
            
            // Remove piece from its current position temporarily
            markedPointsBagh.delete(nearestPoint.index);
            redrawBoard();
            console.log('Started dragging Bagh from', Object.keys(index)[nearestPoint.index]);
            
        } 
        // Check if there's a Bakhra piece at this location
        else if (markedPointsBakhra.has(nearestPoint.index)) {
            isDragging = true;
            draggedPiece = 'bakhra';
            draggedFromIndex = nearestPoint.index;
            mouseX = clickX;
            mouseY = clickY;
            
            // Remove piece from its current position temporarily
            markedPointsBakhra.delete(nearestPoint.index);
            redrawBoard();
            console.log('Started dragging Bakhra from', Object.keys(index)[nearestPoint.index]);
        }
    }
}


function handleMouseMove(event) {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    
    // Redraw board and show piece following mouse
    redrawBoard();
    if (draggedPiece === 'bagh') {
        drawBagh(mouseX, mouseY);
    } else if (draggedPiece === 'bakhra') {
        drawBakhra(mouseX, mouseY);
    }
}


function handleMouseUp(event) {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const dropX = event.clientX - rect.left;
    const dropY = event.clientY - rect.top;
    
    const nearestPoint = findNearestIntersection(dropX, dropY);
    
    // Check if drop location is valid (intersection exists and is empty)
    if (nearestPoint && 
        !markedPointsBagh.has(nearestPoint.index) && 
        !markedPointsBakhra.has(nearestPoint.index)) {
        
        // Place piece at new location
        if (draggedPiece === 'bagh') {
            markedPointsBagh.add(nearestPoint.index);
        } else if (draggedPiece === 'bakhra') {
            markedPointsBakhra.add(nearestPoint.index);
        }
        
        console.log(`Moved ${draggedPiece} to ${Object.keys(index)[nearestPoint.index]}`);
    } else {
        // Invalid drop location - return piece to original position
        if (draggedPiece === 'bagh') {
            markedPointsBagh.add(draggedFromIndex);
        } else if (draggedPiece === 'bakhra') {
            markedPointsBakhra.add(draggedFromIndex);
        }
        
        console.log(`Invalid drop location - returned ${draggedPiece} to original position`);
    }
    
    // Reset drag state
    isDragging = false;
    draggedPiece = null;
    draggedFromIndex = null;
    
    // Final redraw
    redrawBoard();
}


function movePieceToPosition(fromCoordinate, toCoordinate, pieceType) {
    // STEP 1: VALIDATE COORDINATES
    if (!index[fromCoordinate] || !index[toCoordinate]) {
        console.error(`Invalid coordinates: ${fromCoordinate} or ${toCoordinate}`);
        return false;
    }
    
    // STEP 2: FIND THE PIECE AT SOURCE LOCATION
    const fromIndex = intersections.findIndex(point => 
        point.x === index[fromCoordinate].x && point.y === index[fromCoordinate].y
    );
    
    const toIndex = intersections.findIndex(point => 
        point.x === index[toCoordinate].x && point.y === index[toCoordinate].y
    );
    
    // STEP 3: CHECK IF PIECE EXISTS AT SOURCE
    let pieceFound = false;
    if (pieceType === 'bagh' && markedPointsBagh.has(fromIndex)) {
        markedPointsBagh.delete(fromIndex);
        pieceFound = true;
    } else if (pieceType === 'bakhra' && markedPointsBakhra.has(fromIndex)) {
        markedPointsBakhra.delete(fromIndex);
        pieceFound = true;
    }
    
    if (!pieceFound) {
        console.error(`No ${pieceType} found at ${fromCoordinate}`);
        return false;
    }
    
    // STEP 4: CHECK IF DESTINATION IS EMPTY
    if (markedPointsBagh.has(toIndex) || markedPointsBakhra.has(toIndex)) {
        // Return piece to original position
        if (pieceType === 'bagh') {
            markedPointsBagh.add(fromIndex);
        } else {
            markedPointsBakhra.add(fromIndex);
        }
        console.error(`Destination ${toCoordinate} is occupied`);
        return false;
    }
    
    // STEP 5: MOVE PIECE TO DESTINATION
    if (pieceType === 'bagh') {
        markedPointsBagh.add(toIndex);
    } else {
        markedPointsBakhra.add(toIndex);
    }
    
    // STEP 6: REDRAW BOARD AND LOG SUCCESS
    redrawBoard();
    console.log(`Successfully moved ${pieceType} from ${fromCoordinate} to ${toCoordinate}`);
    return true;
}


const redrawBoard = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawPieces(markedPointsBagh, markedPointsBakhra);
}

const initIndex = () => {
    for(let i=0; i<indexValue.length; i++){
        index[indexValue[i]] = intersections[i];
    }
}
function init() {
    
    intersections.push(...calculateIntersections());
    initIndex();
    console.log(index);
    
    drawGrid();

    drawPieces(markedPointsBagh, markedPointsBakhra);
    
    canvas.addEventListener('click', handleCanvasClick);

    setupDragHandlers();

}



init();

