export const MOUNTAIN_ROUTES = [
  {
    id: 0,
    name: 'Gunung Slamet via Bambangan',
    description: 'Jalur pendakian resmi dan terpopuler dengan fasilitas basecamp lengkap.',
    distance: 8.5, // Estimasi km
    elevationGain: 1800, // Estimasi mdpl gain
    startElevation: 1500,
    peakElevation: 3428,
    color: '#FF4500',
    // Koordinat simulasi jalur Bambangan (Basecamp -> Puncak)
    coordinates: [
      { latitude: -7.2435, longitude: 109.2312 }, // Basecamp Bambangan
      { latitude: -7.2450, longitude: 109.2280 }, // Pos 1
      { latitude: -7.2470, longitude: 109.2250 }, // Pos 2
      { latitude: -7.2500, longitude: 109.2200 }, // Pos 3
      { latitude: -7.2520, longitude: 109.2150 }, // Pos 4
      { latitude: -7.2530, longitude: 109.2120 }, // Pos 5
      { latitude: -7.2540, longitude: 109.2100 }, // Pos 6
      { latitude: -7.2550, longitude: 109.2090 }, // Pos 7
      { latitude: -7.2560, longitude: 109.2085 }, // Pos 8
      { latitude: -7.2570, longitude: 109.2080 }, // Pelawangan
      { latitude: -7.2406, longitude: 109.2078 }, // Puncak Surono
    ],
    elevationData: [1500, 1700, 1900, 2100, 2400, 2600, 2800, 3000, 3100, 3200, 3428],
    elevationLabels: ["BC", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "Plw", "Top"],
    basecampLocation: { latitude: -7.2435, longitude: 109.2312 }
  }
];