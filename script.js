/**
 * BAGCHAL INTERACTIVE BOARD - JavaScript Implementation
 * =====================================================
 * 
 * WHAT IS THIS CODE?
 * This code creates an interactive board game called Bagchal, which is a traditional
 * Nepali strategy game. Think of it like a digital version of a board game where:
 * - You see a game board with a grid pattern and diagonal lines
 * - You can click on intersection points to place X markers
 * - The board follows the traditional Bagchal pattern
 * 
 * HOW DOES IT WORK?
 * 1. Uses HTML5 Canvas to draw the game board
 * 2. Detects mouse clicks to place markers
 * 3. Tracks which positions are already occupied
 * 4. Provides visual feedback with red X markers
 * 
 * KEY TECHNOLOGIES USED:
 * - HTML5 Canvas API for drawing
 * - JavaScript event handling for mouse clicks
 * - Mathematical calculations for geometry
 * - Data structures (arrays, sets) for game state
 */

// ============================================================================
// SECTION 1: SETTING UP THE GAME ENVIRONMENT
// ============================================================================

// DOM ELEMENT SELECTION
// ====================
// DOM = Document Object Model (the HTML structure of our webpage)
// We need to "grab" HTML elements so JavaScript can work with them

const board = document.querySelector('.board');          // Find the container div
const canvas = document.getElementById('gameCanvas');    // Find our drawing canvas
const ctx = canvas.getContext('2d');                    // Get the "drawing pen" for canvas


// WHAT IS CANVAS CONTEXT?
// Think of 'ctx' as a digital paintbrush. It's what we use to draw lines, 
// shapes, and text on the canvas. The '2d' means we're drawing flat graphics
// (not 3D objects).

// GAME CONFIGURATION CONSTANTS
// ============================
// Constants are values that never change during the game.
// Using constants makes code easier to understand and modify.

const BOARD_SIZE = 500;         // The actual game board is 500x500 pixels
const PADDING = BOARD_SIZE * 0.1;  // 10% padding around the board (50 pixels)
const CANVAS_SIZE = BOARD_SIZE + (PADDING * 2);  // Canvas size: 500 + 100 = 600 pixels
const GRID_SIZE = 4;            // 4 divisions create 5 lines (like a tic-tac-toe grid but bigger)
const CELL_SIZE = BOARD_SIZE / GRID_SIZE;  // Each cell is 125x125 pixels (500÷4=125)
const CLICK_TOLERANCE = 20;     // Allow clicks within 20 pixels of intersection points


// WHY USE CONSTANTS?
// 1. Easy to change later (just change one number to resize everything)
// 2. Makes code more readable (CANVAS_SIZE is clearer than just "500")
// 3. Prevents accidental changes to important values

// GAME STATE VARIABLES
// ===================
// These variables track what's happening in our game

const intersections = [];       // Array = list of all clickable points on the board
// const markedPoints = new Set(); //fetch from backend for position Set = collection that prevents duplicate entries this is just for trial 
const markedPointsBagh = new Set();// position for bagh
const markedPointsBakhra = new Set();// position for bakhra
// let indexs = ['a1','b1','c1','d1','e1','a2','b2','c2','d2','e2','a3','b3','c3','d3','e3','a4','b4','c4','d4','e4','a5','b5','c5','d5','e5'];
let indexValue = ['a5','b5','c5','d5','e5','a4','b4','c4','d4','e4','a3','b3','c3','d3','e3','a2','b2','c2','d2','e2','a1','b1','c1','d1','e1'];
let index = {};
let player = 'bakhra';
let selectedPiece = null; // Track which piece is selected for moving


//==================================================
//Experiment code for
//===================================================

markedPointsBagh.add('e5');
markedPointsBagh.add('e1');
markedPointsBagh.add('a1');
markedPointsBagh.add('a5');
markedPointsBakhra.add('b4');

let baghCount = 4;
let bakhraCount = 0;

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

// ============================================================================
// SECTION 2: CALCULATING WHERE PLAYERS CAN PLACE MARKERS
// ============================================================================

/**
 * CALCULATE INTERSECTION POINTS
 * ============================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * This function figures out all the spots where players can click to place
 * their markers. In Bagchal, you can only place pieces where lines meet
 * (called "intersection points").
 * 
 * TYPES OF INTERSECTIONS:
 * 1. Grid intersections: where horizontal and vertical lines cross (25 points)
 * 2. Center intersection: where the main diagonal lines meet (1 point)
 * 
 * RETURNS: An array of objects, each containing x,y coordinates and type
 */
function calculateIntersections() {
    const points = [];  // Empty array to store all intersection points
    
    // GRID INTERSECTIONS (25 points total)
    // ===================================
    // Think of this like a tic-tac-toe grid, but 5x5 instead of 3x3
    // We use nested loops to visit every intersection point
    
    for (let row = 0; row <= GRID_SIZE; row++) {        // 5 rows: 0,1,2,3,4
        for (let col = 0; col <= GRID_SIZE; col++) {    // 5 columns: 0,1,2,3,4
            
            // NESTED LOOPS EXPLANATION:
            // Outer loop (row): goes through each horizontal line
            // Inner loop (col): goes through each vertical line  
            // Together: they visit every crossing point
            
            points.push({
                x: col * CELL_SIZE + PADDING,    // X position: column number × cell width + padding offset
                y: row * CELL_SIZE + PADDING,    // Y position: row number × cell height + padding offset
         // Label this as a grid intersection
            });
            
            // COORDINATE SYSTEM (with padding):
            // (25,25) = top-left corner of the board
            // (525,25) = top-right corner of the board
            // (25,525) = bottom-left corner of the board
            // (525,525) = bottom-right corner of the board
        }
    }
    
    // CENTER INTERSECTION (1 point)
    // =============================
    // This is where the two main diagonal lines cross in the middle
    // points.push({
    //     x: BOARD_SIZE / 2 + PADDING,        // Middle X coordinate (275)
    //     y: BOARD_SIZE / 2 + PADDING,        // Middle Y coordinate (275)
    //     type: 'center'             // Label this as the center intersection
    // });
    
    return points;  // Send back the complete list of intersection points
}

// ============================================================================
// SECTION 3: DRAWING THE GAME BOARD
// ============================================================================

/**
 * DRAW THE GAME BOARD
 * ==================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * This is like an artist painting the game board. It draws all the lines
 * that make up the Bagchal board pattern using the HTML5 Canvas API.
 * 
 * BAGCHAL BOARD CONSISTS OF:
 * 1. Grid lines (horizontal and vertical) - creates the basic square grid
 * 2. Corner-to-corner diagonals - long lines connecting opposite corners
 * 3. Diamond pattern - connects the middle points of each edge
 * 
 * CANVAS DRAWING CONCEPTS:
 * - beginPath(): Start drawing a new line
 * - moveTo(x,y): Move the "pen" to a position without drawing
 * - lineTo(x,y): Draw a line from current position to x,y
 * - stroke(): Actually draw the line on the canvas
 */
function drawGrid() {
    
    // SET DRAWING STYLE
    // ================
    // Before drawing, we need to set how the lines should look
    
    ctx.strokeStyle = '#000';  // Line color: black (#000 is hex code for black)
    ctx.lineWidth = 2;         // Line thickness: 2 pixels wide
    
    // HEX COLOR CODES EXPLAINED:
    // #000 = black, #fff = white, #ff0000 = red, #00ff00 = green, #0000ff = blue
    
    
    // PART 1: DRAW HORIZONTAL LINES (5 lines total)
    // =============================================
    // These are the lines that go left-to-right across the board
    
    for (let i = 0; i <= GRID_SIZE; i++) {
        
        // LOOP EXPLANATION:
        // i=0: top line (y=25)
        // i=1: second line (y=150) 
        // i=2: middle line (y=275)
        // i=3: fourth line (y=400)
        // i=4: bottom line (y=525)
        
        ctx.beginPath();                                    // Start a new line
        ctx.moveTo(PADDING, i * CELL_SIZE + PADDING);      // Move to left edge at this row (with padding)
        ctx.lineTo(BOARD_SIZE + PADDING, i * CELL_SIZE + PADDING); // Draw to right edge (with padding)
        ctx.stroke();                                       // Make the line visible
    }
    
    
    // PART 2: DRAW VERTICAL LINES (5 lines total)  
    // ===========================================
    // These are the lines that go top-to-bottom down the board
    
    for (let i = 0; i <= GRID_SIZE; i++) {
        
        // LOOP EXPLANATION:
        // i=0: leftmost line (x=25)
        // i=1: second line (x=150)
        // i=2: middle line (x=275) 
        // i=3: fourth line (x=400)
        // i=4: rightmost line (x=525)
        
        ctx.beginPath();                                    // Start a new line
        ctx.moveTo(i * CELL_SIZE + PADDING, PADDING);      // Move to top edge at this column (with padding)
        ctx.lineTo(i * CELL_SIZE + PADDING, BOARD_SIZE + PADDING); // Draw to bottom edge (with padding)
        ctx.stroke();                                       // Make the line visible
    }
    
    
    // PART 3: DRAW CORNER-TO-CORNER DIAGONALS
    // =======================================
    // These are the two long diagonal lines that make an X across the entire board
    
    // MAIN DIAGONAL: top-left to bottom-right (\)
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);                                   // Start at top-left corner (25,25)
    ctx.lineTo(BOARD_SIZE + PADDING, BOARD_SIZE + PADDING);         // Draw to bottom-right (525,525)
    ctx.stroke();
    
    // ANTI-DIAGONAL: top-right to bottom-left (/)
    ctx.beginPath();
    ctx.moveTo(BOARD_SIZE + PADDING, PADDING);                      // Start at top-right corner (525,25)
    ctx.lineTo(PADDING, BOARD_SIZE + PADDING);                      // Draw to bottom-left (25,525)
    ctx.stroke();
    
    
    // PART 4: DRAW DIAMOND PATTERN
    // ============================
    // This creates a diamond shape by connecting the middle points of each edge
    
    // Calculate where the middle of each edge is located
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
    
    
    // PART 5: DRAW INDEXING TEXT (LABELS)
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
    
    // FINAL RESULT:
    // We now have a complete Bagchal board with:
    // - 5×5 grid of squares
    // - Two diagonal lines crossing the entire board
    // - A diamond pattern in the center
    // - Indexing labels (a-e at bottom, 1-5 on left side)
}

// ============================================================================
// SECTION 4: PLAYER INTERACTION - DRAWING X MARKERS
// ============================================================================

/**
 * DRAW X MARKER
 * =============
 * 
 * WHAT DOES THIS FUNCTION DO?
 * When a player clicks on a valid intersection point, this function draws
 * a red X symbol at that location to show where they placed their marker.
 * 
 * HOW IT WORKS:
 * An X is made of two diagonal lines that cross each other:
 * - One line goes from top-left to bottom-right (\)
 * - Another line goes from top-right to bottom-left (/)
 * 
 * PARAMETERS:
 * x - horizontal position where to draw the X
 * y - vertical position where to draw the X
 */
function drawX(x, y) {
    
    // SAVE CURRENT DRAWING SETTINGS
    // =============================
    // We'll change the color and thickness for the X, but we need to
    // remember the current settings so we can restore them later
    const originalColor = ctx.strokeStyle;
    const originalWidth = ctx.lineWidth;
    
    // SET STYLE FOR X MARKER
    // ======================
    ctx.strokeStyle = '#ff0000';  // Red color (#ff0000 = bright red)
    ctx.lineWidth = 3;            // Make lines thicker for better visibility
    const size = 15;              // Half the width/height of the X (total size = 30 pixels)
    
    // UNDERSTANDING THE SIZE:
    // If size = 15, the X will be 30×30 pixels total
    // We draw from (x-15, y-15) to (x+15, y+15)
    
    
    // DRAW FIRST LINE OF X: top-left to bottom-right (\)
    // ==================================================
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);  // Start at top-left of the X
    ctx.lineTo(x + size, y + size);  // Draw to bottom-right of the X
    ctx.stroke();
    
    // COORDINATE EXPLANATION:
    // (x-size, y-size) = top-left corner of the X
    // (x+size, y+size) = bottom-right corner of the X
    
    
    // DRAW SECOND LINE OF X: top-right to bottom-left (/)
    // ===================================================
    ctx.beginPath();
    ctx.moveTo(x + size, y - size);  // Start at top-right of the X
    ctx.lineTo(x - size, y + size);  // Draw to bottom-left of the X
    ctx.stroke();
    
    // COORDINATE EXPLANATION:
    // (x+size, y-size) = top-right corner of the X
    // (x-size, y+size) = bottom-left corner of the X
    
    
    // RESTORE ORIGINAL DRAWING SETTINGS
    // =================================
    // Put back the original color and line width so future drawing
    // isn't affected by our X marker settings
    ctx.strokeStyle = originalColor;
    ctx.lineWidth = originalWidth;
}

/**
 * DRAW BAGH (TIGER) PIECE
 * =======================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * Draws a black circular piece representing a "bagh" (tiger) in the traditional
 * Bagchal game. Tigers are the predator pieces that try to capture goats.
 * 
 * VISUAL APPEARANCE:
 * - Solid black circle
 * - Medium size to fit nicely on intersection points
 * - Clean, bold appearance for easy identification
 * 
 * PARAMETERS:
 * x - horizontal position where to draw the bagh
 * y - vertical position where to draw the bagh
 */
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
    
    // UNDERSTANDING ctx.arc():
    // arc(x, y, radius, startAngle, endAngle)
    // - (x, y): center point of the circle
    // - radius: distance from center to edge
    // - 0: start angle (0 radians = rightmost point)
    // - 2 * Math.PI: end angle (full circle = 2π radians)
    
    // RESTORE ORIGINAL DRAWING SETTINGS
    // =================================
    ctx.fillStyle = originalFillStyle;
    ctx.strokeStyle = originalStrokeStyle;
}

/**
 * DRAW BAKHRA (GOAT) PIECE  
 * ========================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * Draws a yellow/golden circular piece with black border representing a "bakhra" 
 * (goat) in the traditional Bagchal game. Goats are the prey pieces that try 
 * to block the tigers.
 * 
 * VISUAL APPEARANCE:
 * - Yellow/golden filled circle
 * - Black circular border for definition
 * - Same size as bagh for consistency
 * - Bright color for easy distinction from tigers
 * 
 * PARAMETERS:
 * x - horizontal position where to draw the bakhra
 * y - vertical position where to draw the bakhra
 */
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
    
    // WHY BOTH fill() AND stroke()?
    // - fill(): creates the solid golden interior
    // - stroke(): adds the black outline for definition
    // - This creates a golden circle with black border
    
    // RESTORE ORIGINAL DRAWING SETTINGS
    // =================================
    ctx.fillStyle = originalFillStyle;
    ctx.strokeStyle = originalStrokeStyle;
    ctx.lineWidth = originalLineWidth;
}

// ============================================================================
// SECTION 5: CLICK DETECTION - FINDING THE NEAREST INTERSECTION
// ============================================================================

/**
 * FIND NEAREST INTERSECTION
 * =========================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * When a player clicks somewhere on the canvas, this function figures out
 * which intersection point (if any) they were trying to click on.
 * 
 * WHY IS THIS NEEDED?
 * Players don't click exactly on intersection points. Their mouse might be
 * a few pixels off. This function finds the closest intersection within
 * a reasonable distance (CLICK_TOLERANCE = 20 pixels).
 * 
 * HOW IT WORKS:
 * 1. Check the distance from the click to every intersection point
 * 2. Find the closest one that's within the tolerance distance
 * 3. Return that intersection (or null if none are close enough)
 * 
 * MATH CONCEPT: DISTANCE FORMULA
 * To find distance between two points (x1,y1) and (x2,y2):
 * distance = √[(x2-x1)² + (y2-y1)²]
 * This is called the Pythagorean theorem!
 * 
 * PARAMETERS:
 * clickX - where the player clicked horizontally
 * clickY - where the player clicked vertically
 * 
 * RETURNS:
 * Object with intersection info, or null if no intersection is close enough
 */
function findNearestIntersection(clickX, clickY) {
    
    // VARIABLES TO TRACK THE SEARCH
    // ============================
    let nearest = null;           // Will store the closest intersection we find
    let minDistance = Infinity;   // Track the shortest distance found so far
    
    // WHY START WITH Infinity?
    // We want to find the SMALLEST distance. By starting with Infinity,
    // any real distance will be smaller, so our first comparison will work.
    
    
    // CHECK EVERY INTERSECTION POINT
    // =============================
    // We'll loop through all intersection points and calculate the distance
    // from the click position to each one
    
    for (let i = 0; i < intersections.length; i++) {
        const point = intersections[i];  // Get the current intersection point
        
        // CALCULATE DISTANCE using the Pythagorean theorem
        // ===============================================
        const distance = Math.sqrt(
            Math.pow(clickX - point.x, 2) + Math.pow(clickY - point.y, 2)
        );
        
        // BREAKING DOWN THE MATH:
        // Math.pow(a, 2) = a squared (a²)
        // Math.sqrt(x) = square root of x (√x)
        // So this calculates: √[(clickX-point.x)² + (clickY-point.y)²]
        
        // EXAMPLE:
        // If click is at (100, 150) and intersection is at (105, 145):
        // distance = √[(100-105)² + (150-145)²] = √[25 + 25] = √50 ≈ 7.07 pixels
        
        
        // CHECK IF THIS IS THE CLOSEST POINT SO FAR
        // =========================================
        if (distance < minDistance && distance <= CLICK_TOLERANCE) {
            minDistance = distance;                    // Update the minimum distance
            nearest = { ...point, index: i };         // Remember this intersection
        }
        
        // WHAT DOES {...point, index: i} DO?
        // This creates a new object that copies all properties from 'point'
        // and adds an 'index' property. It's called the "spread operator".
        // Result: {x: 125, y: 250, type: 'grid', index: 5}
    }
    
    // RETURN THE RESULT
    // ================
    return nearest;  // Either an intersection object, or null if none found
    
    // POSSIBLE OUTCOMES:
    // 1. Player clicked near an intersection → return that intersection
    // 2. Player clicked far from all intersections → return null
    // 3. Player clicked near multiple intersections → return the closest one
}


/**
 * REMOVE PIECE FROM BOARD
 * ======================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * This function removes both Bagh (tiger) and Bakhra (goat) pieces from a specific
 * intersection point on the board. It's useful for:
 * - Correcting mistakes (removing wrongly placed pieces)
 * - Implementing game moves (capturing or moving pieces)
 * - Resetting specific board positions
 * 
 * HOW IT WORKS:
 * 1. Takes x,y coordinates of the intersection point
 * 2. Finds the nearest valid intersection (with tolerance)
 * 3. Removes the piece from both Bagh and Bakhra tracking sets
 * 4. Redraws the entire board to reflect the change
 * 
 * PARAMETERS:
 * @param {number} x - The x-coordinate where we want to remove a piece
 * @param {number} y - The y-coordinate where we want to remove a piece
 * 
 * USAGE EXAMPLES:
 * removePiece(150, 150);  // Remove any piece at coordinates (150, 150)
 * removePiece(300, 450);  // Remove any piece at coordinates (300, 450)
 */
function removePiece(x, y) {

    
    const nearestPoint = findNearestIntersection(x, y);
    
    if (nearestPoint !== null) {
        let removedBagh = false;
        let removedBakhra = false;
        if (markedPointsBagh.has(nearestPoint.index)) {
            markedPointsBagh.delete(nearestPoint.index);  // Remove the Bagh piece
            removedBagh = true;
        }

        if (markedPointsBakhra.has(nearestPoint.index)) {
            markedPointsBakhra.delete(nearestPoint.index);  // Remove the Bakhra piece
            removedBakhra = true;
        }
        
        // STEP 4: REDRAW THE BOARD IF SOMETHING WAS REMOVED
        // ================================================
        // Only redraw if we actually removed a piece to avoid unnecessary redraws
        
        if (removedBagh || removedBakhra) {
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

/**
 * REMOVE PIECE BY COORDINATE NAME
 * ==============================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * This is a convenience function that allows removing pieces using
 * chess-style notation like "a1", "c3", "e5" instead of pixel coordinates.
 * 
 * HOW IT WORKS:
 * 1. Takes a coordinate string (like "c3")
 * 2. Looks up the actual x,y pixel coordinates from our index
 * 3. Calls the main removePiece function with those coordinates
 * 
 * PARAMETERS:
 * @param {string} coordinate - Chess-style coordinate (e.g., "a1", "c3", "e5")
 * 
 * USAGE EXAMPLES:
 * removePieceByCoordinate("a1");  // Remove piece from bottom-left corner
 * removePieceByCoordinate("c3");  // Remove piece from center of board
 * removePieceByCoordinate("e5");  // Remove piece from top-right corner
 */
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

// ============================================================================
// SECTION 6: HANDLING MOUSE CLICKS
// ============================================================================

/**
 * HANDLE CANVAS CLICKS
 * ====================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * This is the main "event handler" that responds when a player clicks on
 * the canvas. It's like the "brain" that decides what happens when you click.
 * 
 * THE COMPLETE CLICK PROCESS:
 * 1. Player clicks somewhere on the canvas
 * 2. Browser tells us where they clicked (but coordinates are relative to page)
 * 3. We convert those coordinates to canvas coordinates  
 * 4. We find the nearest intersection point
 * 5. If it's valid and not already marked, we place an X there
 * 
 * COORDINATE CONVERSION:
 * Browser gives us coordinates relative to the entire webpage, but we need
 * coordinates relative to just our canvas. Think of it like converting
 * from "address in the city" to "room number in a building".
 * 
 * PARAMETERS:
 * event - information about the mouse click (provided automatically by browser)
 */
function handleCanvasClick(event) {
    
    // STEP 1: CONVERT CLICK COORDINATES
    // =================================
    // The browser tells us where the click happened relative to the entire page,
    // but we need to know where it happened relative to our canvas
    
    const rect = canvas.getBoundingClientRect();  // Get canvas position and size info
    const clickX = event.clientX - rect.left;     // Convert to canvas X coordinate
    const clickY = event.clientY - rect.top;      // Convert to canvas Y coordinate
    
    // UNDERSTANDING getBoundingClientRect():
    // This method returns an object with info about the canvas:
    // - left: how many pixels from the left edge of the page
    // - top: how many pixels from the top edge of the page  
    // - width: canvas width, height: canvas height
    
    // COORDINATE CONVERSION EXAMPLE:
    // If canvas starts at position (100, 50) on the page,
    // and player clicks at page position (250, 200),
    // then canvas position is (250-100, 200-50) = (150, 150)
    
    
    // STEP 2: FIND THE NEAREST INTERSECTION
    // =====================================
    const nearestPoint = findNearestIntersection(clickX, clickY);
    
    // This calls our function from Section 5 to see if the click
    // was close enough to any intersection point
    
    
    // STEP 3: PLACE X MARKER IF VALID
    // ===============================
    // We only place a marker if two conditions are met:
    // 1. We found a nearby intersection point (nearestPoint is not null)
    // 2. That intersection hasn't been marked yet (!markedPoints.has...)
    
    if (nearestPoint && !markedPointsBagh.has(nearestPoint.index) && !markedPointsBakhra.has(nearestPoint.index) && player === 'bakhra' && bakhraCount <= MAX_BAKHRA) {

        drawBakhra(nearestPoint.x, nearestPoint.y); 
        markedPointsBakhra.add(nearestPoint.index);
        bakhraCount++;

        console.log(Object.keys(index)[nearestPoint.index]);
        console.log(nearestPoint.index);
    }
    // else if(player){

    // } else if(nearestPoint && !markedPointsBagh.has(nearestPoint.index) && !markedPointsBakhra.has(nearestPoint.index) && player === 'bagh' && baghCount >= MAX_BAGH){
            
           
    // }
    
    // WHAT HAPPENS IF CONDITIONS AREN'T MET?
    // ======================================
    // - If nearestPoint is null: player clicked too far from any intersection
    // - If intersection already marked: player clicked on a spot that's taken
    // - In both cases: nothing happens (no X is drawn)
}

// ============================================================================
// SECTION 7: STARTING THE GAME
// ============================================================================

/**
 * INITIALIZE THE GAME
 * ==================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * This is the "setup" function that gets everything ready for the game to work.
 * Think of it like setting up a board game before you start playing.
 * 
 * INITIALIZATION STEPS:
 * 1. Calculate all the intersection points where players can place markers
 * 2. Draw the initial game board with all its lines
 * 3. Set up the click detection so the game responds to mouse clicks
 * 
 * WHY DO WE NEED INITIALIZATION?
 * When the webpage first loads, we have an empty canvas. This function
 * transforms it into a working game board that players can interact with.
 * 
 * WHEN IS THIS CALLED?
 * This function is called once when the webpage finishes loading.
 * After that, the game is ready for players to start clicking.
 */

// ============================================================================
// SECTION 7: DRAG AND DROP FUNCTIONALITY
// ============================================================================

// DRAG STATE VARIABLES
// ===================
let isDragging = false;        // Track if we're currently dragging
let draggedPiece = null;       // Which piece is being dragged
let draggedFromIndex = null;   // Where the piece was dragged from
let mouseX = 0, mouseY = 0;    // Current mouse position

/**
 * SETUP DRAG EVENT HANDLERS
 * =========================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * Sets up all the mouse event listeners needed for drag and drop functionality.
 * This includes mousedown (start drag), mousemove (during drag), and mouseup (end drag).
 */
function setupDragHandlers() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp); // End drag if mouse leaves canvas
}

/**
 * HANDLE MOUSE DOWN (START DRAG)
 * ==============================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * Detects when user starts dragging a piece. Checks if they clicked on an existing
 * piece and starts the drag operation.
 */
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

/**
 * HANDLE MOUSE MOVE (DURING DRAG)
 * ===============================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * Updates the position of the dragged piece as the mouse moves.
 */
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

/**
 * HANDLE MOUSE UP (END DRAG)
 * ==========================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * Handles the end of drag operation. Either places the piece at a new valid location
 * or returns it to its original position if dropped on invalid location.
 */
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

/**
 * MOVE PIECE TO SPECIFIC POSITION
 * ===============================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * Programmatically moves a piece from one position to another using coordinate names.
 * This is useful for implementing game logic or AI moves.
 * 
 * PARAMETERS:
 * @param {string} fromCoordinate - Source position (e.g., "a1", "c3")
 * @param {string} toCoordinate - Destination position (e.g., "b2", "d4")
 * @param {string} pieceType - Type of piece ("bagh" or "bakhra")
 * 
 * USAGE EXAMPLES:
 * movePieceToPosition("c3", "d4", "bagh");    // Move Bagh from c3 to d4
 * movePieceToPosition("a1", "b2", "bakhra");  // Move Bakhra from a1 to b2
 */
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

/**
 * REDRAW BOARD HELPER FUNCTION
 * ============================
 * 
 * WHAT DOES THIS FUNCTION DO?
 * Clears the canvas and redraws the entire board with all pieces.
 * This is used during drag operations and after moves.
 */
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
    
    // STEP 1: CALCULATE ALL INTERSECTION POINTS
    // ========================================
    // This finds all the spots where players can place their markers
    
    intersections.push(...calculateIntersections());
    initIndex();
    console.log(index);
    // WHY USE push(...array)?
    
    // UNDERSTANDING THE SPREAD OPERATOR (...):
    // calculateIntersections() returns an array of points
    // The ... spreads out the array so we can add all points to intersections
    // 
    // This is equivalent to:
    // const points = calculateIntersections();
    // for (let point of points) {
    //     intersections.push(point);
    // }
    
    
    // STEP 2: DRAW THE INITIAL BOARD
    // ==============================
    // This creates all the lines that make up the Bagchal board pattern
    
    drawGrid();


    
    // After this call, players will see:
    // - 5×5 grid of squares
    // - Two diagonal lines crossing the board
    // - Diamond pattern connecting edge midpoints
    
    drawPieces(markedPointsBagh, markedPointsBakhra);
    // STEP 3: SET UP CLICK EVENT HANDLING
    // ==================================
    // This tells the browser: "when someone clicks on the canvas,
    // call our handleCanvasClick function"
    
    canvas.addEventListener('click', handleCanvasClick);
    
    // STEP 4: SET UP DRAG EVENT HANDLING
    // ==================================
    // Add drag functionality for moving pieces
    setupDragHandlers();
    
    // UNDERSTANDING EVENT LISTENERS:
    // addEventListener is how we "listen" for user actions
    // - 'click': the type of event we want to detect
    // - handleCanvasClick: the function to call when it happens
    // 
    // OTHER POSSIBLE EVENTS:
    // - 'mousemove': when mouse moves over the canvas
    // - 'keydown': when a key is pressed
    // - 'resize': when the window size changes
}



init();

