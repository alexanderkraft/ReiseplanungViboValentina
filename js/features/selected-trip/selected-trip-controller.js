export function summarizeSelectedItems(selectedItems) {
  return {
    total: selectedItems.hotels.length + selectedItems.tankstellen.length + selectedItems.pausen.length,
    hotels: selectedItems.hotels.length,
    tankstellen: selectedItems.tankstellen.length,
    pausen: selectedItems.pausen.length
  };
}
