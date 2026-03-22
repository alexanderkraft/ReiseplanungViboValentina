export function sumSelectedHotelCosts(hotels = []) {
  return hotels.reduce((sum, item) => sum + Number(item?.price || 0), 0);
}
