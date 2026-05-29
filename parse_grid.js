// Let's manually map the grid based on the image and hex codes provided.
// Row 1: 0020 - 003B
// Row 2: 003C - 0057
// Row 3: 0058 - 0073
// Row 4: 0074 - 008F
// Row 5: 0090 - 00AB
// Row 6: 00AC - 00C7
// Row 7: 00C8 - 00E3
// Row 8: 00E4 - 00FF

const hexMap = {};
function add(hexStr, char) {
  hexMap[char] = String.fromCharCode(parseInt(hexStr, 16));
}

// Consonants from Row 3 (0058 - 0073) and Row 4 (0074 - 008F)? No.
// Let's just output the indices and we will map them directly.
// We only need to map the Gujarati Unicode to the corresponding hex code String.
