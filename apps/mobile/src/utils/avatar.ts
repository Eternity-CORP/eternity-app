/**
 * Generate unique gradient colors from an Ethereum address (like web3 identicons)
 */
export function generateAvatarColors(address: string): [string, string] {
  const hash = address.toLowerCase().replace('0x', '');

  // First color from first 6 chars
  const color1 = '#' + hash.slice(0, 6);

  // Second color from chars 6-12, but rotate hue for contrast
  const r = parseInt(hash.slice(6, 8), 16);
  const g = parseInt(hash.slice(8, 10), 16);
  const b = parseInt(hash.slice(10, 12), 16);

  // Rotate colors for gradient effect
  const color2 = `rgb(${(r + 128) % 256}, ${(g + 64) % 256}, ${(b + 192) % 256})`;

  return [color1, color2];
}
