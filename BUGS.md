# Known Bugs

## Selection Down with Viewport Overflow
When selecting down and the end of the block extends beyond the end of the viewport, the ending position is wrong.

**Steps to Reproduce**:
1. Position cursor in a block of text
2. Use the select down command (`jumpman.selectDown`)
3. When the target block boundary is outside the visible viewport area
4. The selection ending position is incorrect

**Expected Behavior**: Selection should correctly extend to the block boundary even when it's outside the viewport.

**Actual Behavior**: The ending position of the selection is incorrectly calculated when the block extends beyond the viewport.