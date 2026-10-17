// Especificaciones para el modelador por cortes (loft.js). Medidas en metros; frente del auto hacia +Z.
// GTI: contorno y texturas sacados de las fotos de la unidad; las posiciones salen de la propia foto lateral.
export const SPECS = {
  'golf-gti': {
    L: 4.29, W: 1.79, H: 1.456, belt: 0.99, clear: 0.12,
    wheelR: 0.345, wheelW: 0.225, wheelT: [0.176, 0.842],
    mirror: { z: 0.63, y: 1.02 },
    redStrip: true,
    photo: { url: 'textures/gti-side.jpg', x0: 40, x1: 1132, yg: 608, sy: 0.0037526, w: 1200, h: 900 },
    wheelTex: ['textures/gti-wheel-f.png', 'textures/gti-wheel-r.png'],
    top: [0.522, 0.585, 0.634, 0.732, 0.773, 0.803, 0.818, 0.837, 0.856, 0.871, 0.882, 0.889, 0.897, 0.904, 0.916, 0.927, 0.942, 0.964, 0.979, 0.991, 1.054, 1.073, 1.081, 1.084, 1.084, 1.088, 1.088, 1.084, 1.084, 1.084, 1.103, 1.126, 1.148, 1.175, 1.197, 1.216, 1.238, 1.257, 1.28, 1.298, 1.317, 1.336, 1.355, 1.366, 1.381, 1.392, 1.403, 1.411, 1.418, 1.422, 1.43, 1.433, 1.441, 1.445, 1.445, 1.448, 1.448, 1.452, 1.452, 1.452, 1.452, 1.452, 1.452, 1.448, 1.448, 1.445, 1.445, 1.445, 1.441, 1.437, 1.437, 1.433, 1.433, 1.426, 1.422, 1.418, 1.411, 1.407, 1.4, 1.392, 1.388, 1.381, 1.37, 1.366, 1.358, 1.347, 1.235, 1.19, 1.148, 1.111, 1.066, 1.028, 0.991, 0.717, 0.589, 0.642],
  },
};
