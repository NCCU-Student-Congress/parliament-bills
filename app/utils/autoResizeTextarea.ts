const resizeObservers = new WeakMap<HTMLTextAreaElement, ResizeObserver>();

function resizeTextarea(element: HTMLTextAreaElement) {
  if (CSS.supports('field-sizing', 'content')) return;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

export const vAutoResize = {
  mounted(element: HTMLTextAreaElement) {
    resizeTextarea(element);
    if (CSS.supports('field-sizing', 'content')) return;

    let width = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width === width) return;
      width = entry.contentRect.width;
      resizeTextarea(element);
    });
    observer.observe(element);
    resizeObservers.set(element, observer);
  },
  updated: resizeTextarea,
  unmounted(element: HTMLTextAreaElement) {
    resizeObservers.get(element)?.disconnect();
    resizeObservers.delete(element);
  },
};
