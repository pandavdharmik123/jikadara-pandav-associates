// pdfjs-dist v6 uses Math.sumPrecise, which is still a stage-3 proposal and is
// missing from many WebViews (including Android System WebView). Without it
// the library logs "Math.sumPrecise is not a function" while rendering PDFs.
// A compensated (Neumaier) sum keeps the same numerical behaviour.
if (typeof Math.sumPrecise !== 'function') {
  Object.defineProperty(Math, 'sumPrecise', {
    configurable: true,
    writable: true,
    value: function sumPrecise(values) {
      let sum = 0;
      let compensation = 0;

      for (const value of values) {
        const next = sum + value;
        if (Math.abs(sum) >= Math.abs(value)) {
          compensation += sum - next + value;
        } else {
          compensation += value - next + sum;
        }
        sum = next;
      }

      return sum + compensation;
    },
  });
}
