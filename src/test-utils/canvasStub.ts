interface CanvasStubOptions {
  createLinearGradient?: () => CanvasGradient;
}

export function installCanvasStub(options: CanvasStubOptions = {}): void {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({
      beginPath() {},
      moveTo() {},
      lineTo() {},
      bezierCurveTo() {},
      quadraticCurveTo() {},
      closePath() {},
      arc() {},
      rect() {},
      fill() {},
      stroke() {},
      clearRect() {},
      fillRect() {},
      strokeRect() {},
      save() {},
      restore() {},
      scale() {},
      translate() {},
      setTransform() {},
      setLineDash() {},
      fillText() {},
      strokeText() {},
      measureText: (text: string) => ({ width: text.length * 7 }),
      createLinearGradient:
        options.createLinearGradient ??
        (() =>
          ({
            addColorStop() {},
          }) as CanvasGradient),
      canvas: document.createElement('canvas'),
      globalAlpha: 1,
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      font: '12px sans-serif',
      textAlign: 'left',
      textBaseline: 'alphabetic',
    }),
  });
}
